import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Güncellenmiş prisma importu
import { z } from 'zod';
import { uploadToGCS } from '@/lib/gcs';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth" // Auth seçeneklerini import et

// Genel Zod şeması (dosyalar hariç)
const baseQuoteSchema = z.object({
  type: z.enum(['film', 'game']),
  quote: z.string().min(1, 'Quote is required'),
  character: z.string().min(1, 'Character name is required'),
  title: z.string().min(1, 'Title is required'),
  to: z.string().optional().nullable(), // Boş string veya null kabul et
});

// GET - Tüm soruları (film ve oyun) listele
export async function GET() {
  try {
    // Yetkilendirme kontrolü (örneğin, sadece adminler mi listelesin?)
    // İsterseniz buraya getServerSession ile kontrol ekleyebilirsiniz.
    // Şimdilik herkesin listelemesine izin veriyoruz.

    const filmQuotes = await prisma.filmQuote.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const gameQuotes = await prisma.gameQuote.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // İki listeyi birleştirip, her birine type alanı ekleyerek döndür
    const allQuotes = [
      ...filmQuotes.map(q => ({ ...q, type: 'film' as const })),
      ...gameQuotes.map(q => ({ ...q, type: 'game' as const })),
    ];

    // İsteğe bağlı olarak birleşik listeyi tekrar sıralayabilirsiniz (örneğin, tarihe göre)
    allQuotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json(allQuotes);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST - Yeni soru (film veya oyun) oluştur
export async function POST(request: Request) {
  // 1. Yetkilendirme Kontrolü (Admin mi?)
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. FormData'yı Ayrıştırma
    const formData = await request.formData();
    const voiceFile = formData.get('voice_record') as File | null;
    const imageFile = formData.get('image') as File | null;
    const type = formData.get('type') as 'film' | 'game' | null;

    if (!type || (type !== 'film' && type !== 'game')) {
        return NextResponse.json({ errors: { type: ['Invalid type specified'] } }, { status: 400 });
    }

    // 3. Veri Doğrulama (Zod)
    const validatedData = baseQuoteSchema.safeParse({
      type: type,
      quote: formData.get('quote'),
      character: formData.get('character'),
      title: formData.get('title'),
      to: formData.get('to') || null, // Boş string'i null yap
    });

    if (!validatedData.success) {
      console.error("Validation Errors:", validatedData.error.flatten().fieldErrors);
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    // 4. Dosyaları GCS'ye Yükleme
    let voiceRecordUrl: string | null = null;
    let imageUrl: string | null = null;
    const uploadPromises: Promise<void>[] = []; // Yüklemeleri paralel yapmak için

    if (voiceFile && voiceFile.size > 0) {
       uploadPromises.push(
           (async () => {
               const voiceBuffer = Buffer.from(await voiceFile.arrayBuffer());
               voiceRecordUrl = await uploadToGCS(voiceBuffer, voiceFile.name, 'audio');
           })()
       );
    }

    if (imageFile && imageFile.size > 0) {
        uploadPromises.push(
            (async () => {
                const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
                imageUrl = await uploadToGCS(imageBuffer, imageFile.name, 'images');
            })()
        );
    }

    // Tüm yüklemelerin tamamlanmasını bekle
    await Promise.all(uploadPromises);

    // 5. Veritabanına Kaydetme (type'a göre)
    let newQuestion;
    const dataToSave = {
        ...validatedData.data,
        voice_record: voiceRecordUrl, // Prisma şemasındaki alan adları
        image: imageUrl,          // Prisma şemasındaki alan adları
    };
    // 'type' alanı Prisma modelinde olmadığı için dataToSave'den çıkarıyoruz
    // const { type: extractedType, ...prismaData } = dataToSave; // Kullanılmıyor, direkt prismaData oluşturulabilir
    const prismaData = {
        quote: dataToSave.quote,
        character: dataToSave.character,
        title: dataToSave.title,
        to: dataToSave.to,
        voice_record: dataToSave.voice_record,
        image: dataToSave.image,
    };

    if (type === 'film') {
      newQuestion = await prisma.filmQuote.create({
        data: prismaData,
      });
    } else { // type === 'game'
      newQuestion = await prisma.gameQuote.create({
        data: prismaData,
      });
    }

    // Oluşturulan kayda 'type' alanını ekleyerek döndür
    return NextResponse.json({ ...newQuestion, type: type }, { status: 201 });

  } catch (error) {
    // Log the detailed error
    console.error('Error creating question (POST /api/questions):', error);

    // Determine a more specific error message
    let errorMessage = 'Failed to create question';
    let statusCode = 500;

    if (error instanceof z.ZodError) {
        errorMessage = 'Validation failed';
        statusCode = 400;
        // Optionally log validation errors specifically
        // console.error("Validation Errors:", error.flatten().fieldErrors);
    } else if (error instanceof Error) {
        // Check if it's a GCS upload error from our custom throw
        if (error.message?.includes('Failed to upload')) {
           errorMessage = `File upload failed: ${error.message}`;
           statusCode = 500; // Or maybe 400 depending on the GCS error reason
        } else {
           // Generic error message
           errorMessage = error.message;
        }
    } else {
        // Unknown error type
        errorMessage = 'An unknown error occurred during question creation.';
    }

    // Return the specific error message and status code
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  } finally {
      // prisma.$disconnect(); // Gerekirse bağlantıyı kapat (genellikle global instance için gerekmez)
  }
} 