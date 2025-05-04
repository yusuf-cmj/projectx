import { Storage, StorageOptions } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// GCS Bucket Name (her zaman gerekli)
const bucketName = process.env.GCS_BUCKET_NAME;
if (!bucketName) {
  throw new Error('Missing Google Cloud Storage environment variable: GCS_BUCKET_NAME');
}

// Kimlik bilgileri yapılandırması
let storageOptions: StorageOptions = {};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // GOOGLE_APPLICATION_CREDENTIALS tanımlıysa, kütüphane otomatik olarak okur.
  // Proje ID'sini de genellikle anahtar dosyasından alır.
  console.log('Using GOOGLE_APPLICATION_CREDENTIALS for GCS authentication.');
  // storageOptions'ı boş bırakabiliriz veya gerekirse sadece proje ID'sini belirtebiliriz
  // storageOptions.projectId = process.env.GCS_PROJECT_ID; // Gerekirse
} else {
  // GOOGLE_APPLICATION_CREDENTIALS tanımlı değilse, diğer değişkenleri kontrol et
  console.log('GOOGLE_APPLICATION_CREDENTIALS not set, checking for individual GCS variables.');
  const projectId = process.env.GCS_PROJECT_ID;
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Google Cloud Storage environment variables. Set either GOOGLE_APPLICATION_CREDENTIALS or GCS_PROJECT_ID, GCS_CLIENT_EMAIL, and GCS_PRIVATE_KEY.');
  }

  storageOptions = {
    projectId: projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  };
}

const storage = new Storage(storageOptions);

export async function uploadToGCS(
  fileBuffer: Buffer,
  originalFilename: string,
  folder: 'images' | 'audio'
): Promise<string> {
  const bucket = storage.bucket(bucketName!);
  // Generate a unique filename including a timestamp prefix for better sorting/debugging
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}-${uuidv4()}${path.extname(originalFilename)}`;
  const destination = `${folder}/${uniqueFilename}`;
  const file = bucket.file(destination);

  try {
      await file.save(fileBuffer, {
        metadata: {
          // Consider adding cacheControl: 'public, max-age=31536000' for long-term caching
        },
        validation: 'md5', // Enable MD5 validation for data integrity
      });

      console.log(`Successfully uploaded ${originalFilename} to gs://${bucketName!}/${destination}`);

      // Return the public URL
      // Ensure the bucket has public access enabled or configure Signed URLs if needed
      return `https://storage.googleapis.com/${bucketName!}/${destination}`;

  } catch (error: unknown) {
     // Log the full error object for detailed debugging
     console.error(`Detailed GCS Upload Error for ${originalFilename}:`, error);

     // Extract a more meaningful error message from GCS error object
     let detailMessage = 'Unknown error';
     if (typeof error === 'object' && error !== null) {
         if ('message' in error && typeof error.message === 'string') {
             detailMessage = error.message;
         } else {
            // Fallback if no message field
            detailMessage = JSON.stringify(error);
         }
     }

     throw new Error(`Failed to upload ${originalFilename} to Google Cloud Storage. Reason: ${detailMessage}`);
  }
}

export async function deleteFromGCS(fileUrl: string | null | undefined): Promise<void> {
   // Ignore null, undefined, or non-GCS URLs
   if (!fileUrl || !fileUrl.startsWith(`https://storage.googleapis.com/${bucketName!}/`)) {
    // console.warn(`Invalid or missing GCS URL, skipping deletion: ${fileUrl}`);
    return;
  }

  try {
    const bucket = storage.bucket(bucketName!);
    // Extract the file path (object name) from the URL
    const filePath = fileUrl.substring(`https://storage.googleapis.com/${bucketName!}/`.length);

    if (!filePath) {
        console.warn(`Could not extract file path from URL, skipping deletion: ${fileUrl}`);
        return;
    }

    const file = bucket.file(filePath);
    await file.delete();
    console.log(`Successfully deleted ${filePath} from GCS.`);
  } catch (error: unknown) {
     // If the file doesn't exist, GCS throws an error with code 404. We can safely ignore this.
     let code = 0;
     if(typeof error === 'object' && error !== null && 'code' in error) {
        code = Number(error.code);
     }

     if (code === 404) {
        // console.warn(`File not found in GCS during deletion attempt (safe to ignore): ${fileUrl}`);
     } else {
        console.error(`Error deleting file ${fileUrl} from GCS:`, error);
        // Hata mesajını kontrol et ve logla
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(` > GCS Delete Error Message: ${errorMessage}`);
        // throw new Error(`Failed to delete ${fileUrl} from GCS. Reason: ${errorMessage}`); // Gerekirse hatayı yukarı taşı
     }
  }
} 