'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { X, Eye } from 'lucide-react'

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"]
const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav"]
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formSchema = z.object({
  type: z.enum(['film', 'game']),
  quote: z.string().min(1, 'Quote is required'),
  character: z.string().min(1, 'Character name is required'),
  title: z.string().min(1, 'Title is required'),
  to: z.string().optional(),
  voice_record: z.instanceof(File)
    .refine(
      (file) => !file || ACCEPTED_AUDIO_TYPES.includes(file.type),
      "Only .mp3 and .wav files are accepted."
    )
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      `Audio file size should be less than 5MB`
    )
    .optional(),
  image: z.instanceof(File)
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg and .png files are accepted."
    )
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      `Image file size should be less than 5MB`
    )
    .optional(),
})

export function CreateQuestionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (audioPreview) URL.revokeObjectURL(audioPreview)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [audioPreview, imagePreview])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'film',
      quote: '',
      character: '',
      title: '',
      to: '',
    },
  })

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
        toast.error("Only .mp3 and .wav files are accepted")
        e.target.value = ''
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Audio file size should be less than 5MB")
        e.target.value = ''
        return
      }
      if (audioPreview) URL.revokeObjectURL(audioPreview)
      const url = URL.createObjectURL(file)
      setAudioPreview(url)
      form.setValue('voice_record', file)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Only .jpg, .jpeg and .png files are accepted")
        e.target.value = ''
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image file size should be less than 5MB")
        e.target.value = ''
        return
      }
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      const url = URL.createObjectURL(file)
      setImagePreview(url)
      form.setValue('image', file)
    }
  }

  const clearAudioPreview = () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview)
      setAudioPreview(null)
      form.setValue('voice_record', undefined)
    }
  }

  const clearImagePreview = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
      form.setValue('image', undefined)
    }
  }

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearAudioPreview();
    clearImagePreview();
    form.reset();
  }

  const openImageModal = () => setIsImageModalOpen(true);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const formData = new FormData();

    // Temel alanları FormData'ya ekle
    formData.append('type', values.type);
    formData.append('quote', values.quote);
    formData.append('character', values.character);
    formData.append('title', values.title);
    if (values.to) {
      formData.append('to', values.to);
    }

    // Dosyaları ekle (varsa)
    // Form state'indeki değerler File nesneleri olmalı
    const voiceFile = form.getValues('voice_record');
    const imageFile = form.getValues('image');

    if (voiceFile instanceof File) {
      formData.append('voice_record', voiceFile);
    }
    if (imageFile instanceof File) {
      formData.append('image', imageFile);
    }

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        body: formData,
        // Tarayıcı FormData ile Content-Type'ı otomatik ayarlar
      });

      if (!response.ok) {
        let errorMsg = 'Failed to create quote';
        try {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            // Zod hatalarını daha kullanıcı dostu göster
            if (errorData.errors) {
                 const messages = Object.entries(errorData.errors)
                     .map(([field, msg]) => `${field}: ${(msg as string[]).join(', ')}`)
                     .join('; ');
                 errorMsg = `Validation failed: ${messages}`;
            } else {
                 errorMsg = errorData.error || `API Error (${response.status})`;
            }
        } catch (parseError: unknown) {
             // JSON parse hatası
             console.error("API response parsing error:", parseError);
             errorMsg = `API Error (${response.status}) - Response not valid JSON`;
        }
        throw new Error(errorMsg);
      }

      const newQuestion = await response.json();
      console.log('Successfully created:', newQuestion);
      toast.success('Quote created successfully!');
      clearAudioPreview();
      clearImagePreview();
      form.reset();
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(message);
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="film" className="text-gray-300 hover:bg-gray-800">Film Quote</SelectItem>
                    <SelectItem value="game" className="text-gray-300 hover:bg-gray-800">Game Quote</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quote"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">Quote</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter the quote"
                    className="resize-none bg-gray-800 border-gray-700 text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="character"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">Character</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter character name" 
                    className="bg-gray-800 border-gray-700 text-white"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter movie/game title" 
                    className="bg-gray-800 border-gray-700 text-white"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">To (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Who is the quote directed to?" 
                    className="bg-gray-800 border-gray-700 text-white"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="voice_record"
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Voice Record (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".mp3,.wav"
                        className="bg-gray-800 border-gray-700 text-white"
                        {...field}
                        onChange={handleAudioChange}
                        disabled={isSubmitting}
                      />
                      {(audioPreview || value) && (
                        <div className="relative bg-gray-800 p-4 rounded-md border border-gray-700">
                          <audio
                            controls
                            src={audioPreview || (value instanceof File ? URL.createObjectURL(value) : undefined)}
                            className="w-full"
                          />
                          <button
                            type="button"
                            onClick={clearAudioPreview}
                            className="absolute -top-2 -right-2 p-1 bg-red-500/20 rounded-full text-red-400 hover:bg-red-500/30 hover:text-white shadow-md"
                            disabled={isSubmitting}
                            aria-label="Clear audio"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Scene Image (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        className="bg-gray-800 border-gray-700 text-white"
                        {...field}
                        onChange={handleImageChange}
                        disabled={isSubmitting}
                      />
                      {(imagePreview || value) && (
                        <div className="relative group bg-gray-800 p-4 rounded-md border border-gray-700">
                          <Image
                            src={imagePreview || (value instanceof File ? URL.createObjectURL(value) : undefined) || ''}
                            alt="Preview"
                            width={400}
                            height={300}
                            className="w-full max-h-[200px] object-contain rounded-md cursor-pointer transition-opacity group-hover:opacity-70"
                            unoptimized={true}
                            onClick={openImageModal}
                          />
                          <div 
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                            onClick={openImageModal}
                          >
                            <Eye className="w-10 h-10 text-white" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearImagePreview();
                            }}
                            className="absolute -top-2 -right-2 z-10 p-1 bg-red-500/20 rounded-full text-red-400 hover:bg-red-500/30 hover:text-white shadow-md"
                            aria-label="Clear image"
                            disabled={isSubmitting}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gray-700 hover:bg-gray-600"
            >
              {isSubmitting ? 'Creating...' : 'Create Quote'}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[600px] p-0">
          <DialogHeader className="p-4 border-b border-gray-800">
            <DialogTitle className="text-white">Image Preview</DialogTitle>
          </DialogHeader>
          <div className="p-4 flex justify-center items-center">
            {imagePreview && (
              <Image
                src={imagePreview}
                alt="Full preview"
                width={550} 
                height={450}
                className="max-w-full max-h-[70vh] object-contain"
                unoptimized={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 