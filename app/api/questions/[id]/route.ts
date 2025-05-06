import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { FilmQuote, GameQuote/*, Prisma*/ } from '@prisma/client'; // Prisma kullanılmıyor
import { z } from 'zod';
import { uploadToGCS, deleteFromGCS } from '@/lib/gcs';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Güncelleme için Zod şeması (tüm alanlar opsiyonel)
const baseQuoteUpdateSchema = z.object({
  quote: z.string().min(1, 'Quote is required').optional(),
  character: z.string().min(1, 'Character name is required').optional(),
  title: z.string().min(1, 'Title is required').optional(),
  to: z.string().optional().nullable(), // Boş string'i null yap veya mevcut kalsın
  // type alanı değiştirilemez varsayıyoruz
});

// PUT - Soruyu (film veya oyun) güncelle
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  // 1. Yetkilendirme Kontrolü (Admin mi?)
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Request Type ve ID'yi anlama
    // Frontend'in güncelleme isteğinde quote'un tipini göndermesi GEREKİR.
    // Örneğin, FormData'da veya URL query parametresi olarak (?type=film)
    const formData = await request.formData();
    const type = formData.get('type') as 'film' | 'game' | null;

    if (!type || (type !== 'film' && type !== 'game')) {
        return NextResponse.json({ error: 'Missing or invalid type in request body' }, { status: 400 });
    }

    // 3. Mevcut Kaydı Bul
    let currentQuote: FilmQuote | GameQuote | null = null;
    let oldVoiceUrl: string | null = null;
    let oldImageUrl: string | null = null;

    if (type === 'film') {
      const foundQuote = await prisma.filmQuote.findUnique({ where: { id } });
      if (foundQuote) {
          currentQuote = foundQuote; // Genel tipe ata
          oldVoiceUrl = foundQuote.voice_record; // Spesifik tipten oku
          oldImageUrl = foundQuote.image;        // Spesifik tipten oku
      }
    } else { // type === 'game'
      const foundQuote = await prisma.gameQuote.findUnique({ where: { id } });
       if (foundQuote) {
          currentQuote = foundQuote; // Genel tipe ata
          oldVoiceUrl = foundQuote.voice_record; // Spesifik tipten oku
          oldImageUrl = foundQuote.image;        // Spesifik tipten oku
       }
    }

    if (!currentQuote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // 4. Veri Doğrulama (Zod)
    // FormData'dan sadece güncellenecek alanları al
    const dataToParse: Record<string, unknown> = {};
    if (formData.has('quote')) dataToParse.quote = formData.get('quote');
    if (formData.has('character')) dataToParse.character = formData.get('character');
    if (formData.has('title')) dataToParse.title = formData.get('title');
    if (formData.has('to')) dataToParse.to = formData.get('to') || null;

    const validatedData = baseQuoteUpdateSchema.safeParse(dataToParse);

    if (!validatedData.success) {
      console.error("Validation Errors:", validatedData.error.flatten().fieldErrors);
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    // 5. Dosyaları İşleme (Yükleme/Silme)
    const voiceFile = formData.get('voice_record') as File | null;
    const imageFile = formData.get('image') as File | null;
    const clearVoice = formData.get('clear_voice') === 'true';
    const clearImage = formData.get('clear_image') === 'true';

    // updateData tipini belirle
    type UpdateDataType = Partial<Omit<FilmQuote | GameQuote, 'id' | 'createdAt' | 'updatedAt'>>;
    const updateData: UpdateDataType = {};

    // Doğrulanmış veriyi updateData'ya güvenli bir şekilde ata
    if (validatedData.success) {
        Object.assign(updateData, validatedData.data);
    } // Başarısızsa zaten yukarıda hata dönmüştü

    const uploadPromises: Promise<void>[] = [];
    // oldVoiceUrl ve oldImageUrl'ı burada tanımla (currentQuote null değilse)
    // Tip belirsizliğini gidermek için cast edelim
    // let oldVoiceUrl = (currentQuote as FilmQuote | GameQuote).voice_record;
    // let oldImageUrl = (currentQuote as FilmQuote | GameQuote).image;

    // Ses Dosyası
    if (clearVoice) {
      if (oldVoiceUrl) uploadPromises.push(deleteFromGCS(oldVoiceUrl));
      updateData.voice_record = null;
      // oldVoiceUrl = null; // Artık silindi
    } else if (voiceFile && voiceFile.size > 0) {
      if (oldVoiceUrl) uploadPromises.push(deleteFromGCS(oldVoiceUrl)); // Eski sesi sil
      uploadPromises.push(
          (async () => {
            const voiceBuffer = Buffer.from(await voiceFile.arrayBuffer());
            updateData.voice_record = await uploadToGCS(voiceBuffer, voiceFile.name, 'audio');
          })()
      );
      // oldVoiceUrl = null; // Yeni yüklenecek
    }

    // Resim Dosyası
    if (clearImage) {
      if (oldImageUrl) uploadPromises.push(deleteFromGCS(oldImageUrl));
      updateData.image = null;
      // oldImageUrl = null;
    } else if (imageFile && imageFile.size > 0) {
      if (oldImageUrl) uploadPromises.push(deleteFromGCS(oldImageUrl)); // Eski resmi sil
       uploadPromises.push(
          (async () => {
            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
            updateData.image = await uploadToGCS(imageBuffer, imageFile.name, 'images');
          })()
       );
      // oldImageUrl = null;
    }

    // Tüm GCS işlemlerinin tamamlanmasını bekle
    await Promise.all(uploadPromises);

    // 6. Veritabanını Güncelle
    let updatedQuote;
    if (type === 'film') {
      updatedQuote = await prisma.filmQuote.update({
        where: { id },
        data: updateData,
      });
    } else { // type === 'game'
      updatedQuote = await prisma.gameQuote.update({
        where: { id },
        data: updateData,
      });
    }

    // Güncellenen kayda 'type' alanını ekleyerek döndür
    return NextResponse.json({ ...updatedQuote, type: type });

  } catch (error: unknown) {
    console.error(`Error updating question ${id}:`, error);
    let errorMessage = 'Failed to update question';
    if (error instanceof z.ZodError) {
        errorMessage = 'Validation failed';
    } else if (error instanceof Error) {
        if (error.message?.includes('upload') || error.message?.includes('delete')) {
            errorMessage = 'File operation failed';
        }
    } else {
        errorMessage = 'An unknown error occurred during question update.';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Soruyu (film veya oyun) sil
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  // 1. Yetkilendirme Kontrolü (Admin mi?)
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Request Type'ı anlama
    // Frontend'in silme isteğinde quote'un tipini göndermesi GEREKİR.
    // Örneğin, URL query parametresi olarak (?type=film)
    const url = new URL(request.url);
    const type = url.searchParams.get('type') as 'film' | 'game' | null;

     if (!type || (type !== 'film' && type !== 'game')) {
        return NextResponse.json({ error: 'Missing or invalid type in query parameter' }, { status: 400 });
    }

    // 3. Silinecek Kaydı Bul (Dosya URL'leri için)
    let quoteToDelete: { voice_record: string | null, image: string | null } | null = null;
    if (type === 'film') {
      quoteToDelete = await prisma.filmQuote.findUnique({
        where: { id },
        select: { voice_record: true, image: true },
      });
    } else {
      quoteToDelete = await prisma.gameQuote.findUnique({
        where: { id },
        select: { voice_record: true, image: true },
      });
    }

    if (!quoteToDelete) {
      // Kayıt bulunamazsa bile 200 döndürmek tartışılabilir, idempotentlik açısından
      // Şimdilik hata döndürelim
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // 4. Veritabanından Sil
    if (type === 'film') {
        await prisma.filmQuote.delete({ where: { id } });
    } else {
        await prisma.gameQuote.delete({ where: { id } });
    }

    // 5. Dosyaları GCS'den Sil
    const deletePromises: Promise<void>[] = [];
    if (quoteToDelete.voice_record) {
      deletePromises.push(deleteFromGCS(quoteToDelete.voice_record));
    }
    if (quoteToDelete.image) {
      deletePromises.push(deleteFromGCS(quoteToDelete.image));
    }
    await Promise.all(deletePromises);

    return NextResponse.json({ message: 'Quote deleted successfully' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error deleting question ${id}:`, error);
     let errorMessage = 'Failed to delete question';
     if (error instanceof Error) {
         if (error.message?.includes('delete')) {
            errorMessage = 'File deletion failed';
         }
     } else {
        errorMessage = 'An unknown error occurred during question deletion.';
     }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 