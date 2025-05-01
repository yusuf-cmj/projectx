'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Edit2, Trash2, Music, Image as ImageIcon, X, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

type Quote = {
  id: string;
  type: 'film' | 'game';
  quote: string;
  character: string;
  title: string;
  to: string | null;
  voice_record: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

type EditedQuoteState = Omit<Quote, 'createdAt' | 'updatedAt'> & {
    newVoiceFile?: File | null;
    newImageFile?: File | null;
    clearVoice?: boolean;
    clearImage?: boolean;
};

export function EditQuestionForm() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQuoteForEdit, setSelectedQuoteForEdit] = useState<Quote | null>(null)
  const [selectedQuoteForDelete, setSelectedQuoteForDelete] = useState<Quote | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editedQuote, setEditedQuote] = useState<EditedQuoteState | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    async function fetchQuotes() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/questions');
        if (!response.ok) {
          throw new Error(`Failed to fetch quotes (${response.status})`);
        }
        const data: Quote[] = await response.json();
        setQuotes(data);
      } catch (error: unknown) {
        console.error("Error fetching quotes:", error);
        const message = error instanceof Error ? error.message : "Failed to load quotes.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuotes();
  }, []);

  useEffect(() => {
    return () => {
      if (audioPreview) URL.revokeObjectURL(audioPreview)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [audioPreview, imagePreview])

  const handleEditClick = (quote: Quote) => {
    setSelectedQuoteForEdit(quote)
    setEditedQuote({
        ...quote,
        newVoiceFile: null,
        newImageFile: null,
        clearVoice: false,
        clearImage: false,
    });
    setAudioPreview(null);
    setImagePreview(null);
    setShowEditDialog(true);
  }

  const handleDeleteClick = (quote: Quote) => {
    setSelectedQuoteForDelete(quote)
    setShowDeleteDialog(true)
  }

  const closeEditDialog = () => {
      setShowEditDialog(false);
      setSelectedQuoteForEdit(null);
      setEditedQuote(null);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setAudioPreview(null);
      setImagePreview(null);
      closeImageModal();
  }

  const closeDeleteDialog = () => {
      setShowDeleteDialog(false);
      setSelectedQuoteForDelete(null);
  }

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editedQuote) {
       if (!file.type.startsWith('audio/')) {
         toast.error('Please select an audio file');
         e.target.value = '';
         return;
       }
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      const url = URL.createObjectURL(file);
      setAudioPreview(url);
      setEditedQuote(prev => prev ? {
          ...prev,
          newVoiceFile: file,
          clearVoice: false,
          voice_record: null
      } : null);
      e.target.value = '';
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editedQuote) {
       if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file');
          e.target.value = '';
          return;
       }
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setEditedQuote(prev => prev ? {
          ...prev,
          newImageFile: file,
          clearImage: false,
          image: null
      } : null);
      e.target.value = '';
    }
  }

  const clearAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(null);
    setEditedQuote(prev => prev ? {
        ...prev,
        newVoiceFile: null,
        voice_record: null,
        clearVoice: true
    } : null);
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setEditedQuote(prev => prev ? {
        ...prev,
        newImageFile: null,
        image: null,
        clearImage: true
    } : null);
  }

  const openImageModal = () => setIsImageModalOpen(true)
  const closeImageModal = () => setIsImageModalOpen(false)

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedQuote || !selectedQuoteForEdit) return;

    setIsSubmitting(true);
    const formData = new FormData();

    formData.append('type', editedQuote.type);
    if (editedQuote.quote !== selectedQuoteForEdit.quote) formData.append('quote', editedQuote.quote);
    if (editedQuote.character !== selectedQuoteForEdit.character) formData.append('character', editedQuote.character);
    if (editedQuote.title !== selectedQuoteForEdit.title) formData.append('title', editedQuote.title);
    if (editedQuote.to !== selectedQuoteForEdit.to) formData.append('to', editedQuote.to ?? '');

    if (editedQuote.newVoiceFile) {
        formData.append('voice_record', editedQuote.newVoiceFile);
    } else if (editedQuote.clearVoice) {
        formData.append('clear_voice', 'true');
    }

    if (editedQuote.newImageFile) {
        formData.append('image', editedQuote.newImageFile);
    } else if (editedQuote.clearImage) {
        formData.append('clear_image', 'true');
    }

    try {
        const response = await fetch(`/api/questions/${selectedQuoteForEdit.id}`,
         {
            method: 'PUT',
            body: formData,
        });

        if (!response.ok) {
            let errorMsg = 'Failed to update quote';
            try {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                 if (errorData.errors) {
                      const messages = Object.entries(errorData.errors)
                          .map(([field, msg]) => `${field}: ${(msg as string[]).join(', ')}`)
                          .join('; ');
                      errorMsg = `Validation failed: ${messages}`;
                 } else {
                      errorMsg = errorData.error || `API Error (${response.status})`;
                 }
            } catch (parseError: unknown) {
                 console.error("API response parsing error (Update):", parseError);
                 errorMsg = `API Error (${response.status}) - Response not valid JSON`;
            }
            throw new Error(errorMsg);
        }

        const updatedQuote: Quote = await response.json();

        setQuotes(quotes.map(q =>
          q.id === updatedQuote.id ? updatedQuote : q
        ));

        toast.success('Quote updated successfully');
        closeEditDialog();

    } catch (error: unknown) {
      console.error('Error saving quote:', error);
      const message = error instanceof Error ? error.message : 'Failed to update quote';
      toast.error(message);
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedQuoteForDelete) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/questions/${selectedQuoteForDelete.id}?type=${selectedQuoteForDelete.type}`,
       {
        method: 'DELETE',
      });

       if (!response.ok) {
            let errorMsg = 'Failed to delete quote';
            try {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                errorMsg = errorData.error || `API Error (${response.status})`;
            } catch (parseError: unknown) {
                 console.error("API response parsing error (Delete):", parseError);
                 errorMsg = `API Error (${response.status}) - Response not valid JSON`;
            }
            throw new Error(errorMsg);
      }

      setQuotes(quotes.filter(q => q.id !== selectedQuoteForDelete.id));
      toast.success('Quote deleted successfully');
      closeDeleteDialog();

    } catch (error: unknown) {
        console.error('Error deleting quote:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete quote';
        toast.error(message);
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
      return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Quote</TableHead>
              <TableHead>Character</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Media</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 && !isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        No quotes found.
                    </TableCell>
                </TableRow>
            ) : (
                quotes.map((quote) => (
                  <TableRow key={`${quote.type}-${quote.id}`}>
                    <TableCell className="font-medium capitalize">{quote.type}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={quote.quote}>{quote.quote}</TableCell>
                    <TableCell>{quote.character}</TableCell>
                    <TableCell>{quote.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {quote.voice_record && <Music className="w-4 h-4 text-blue-500" />}
                        {quote.image && <ImageIcon className="w-4 h-4 text-green-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(quote)}
                          disabled={isSubmitting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(quote)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showEditDialog} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
            <DialogDescription>
              Make changes to the quote here. Click save when you are done.
            </DialogDescription>
          </DialogHeader>
          {editedQuote && (
            <form onSubmit={handleSaveEdit}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right">Type</label>
                        <Input value={editedQuote.type} disabled className="col-span-3 capitalize" />
                     </div>
                    <div className="grid gap-2">
                        <label>Quote</label>
                        <Textarea
                            value={editedQuote.quote}
                            onChange={(e) =>
                                setEditedQuote(prev => prev ? { ...prev, quote: e.target.value } : null)
                            }
                            disabled={isSubmitting}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                        <label>Character</label>
                        <Input
                            value={editedQuote.character}
                            onChange={(e) =>
                            setEditedQuote(prev => prev ? { ...prev, character: e.target.value } : null)
                            }
                            disabled={isSubmitting}
                            required
                        />
                        </div>
                        <div className="grid gap-2">
                        <label>Title</label>
                        <Input
                            value={editedQuote.title}
                            onChange={(e) =>
                            setEditedQuote(prev => prev ? { ...prev, title: e.target.value } : null)
                            }
                            disabled={isSubmitting}
                            required
                        />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <label>To (Optional)</label>
                        <Input
                            value={editedQuote?.to ?? ''}
                            onChange={(e) =>
                                setEditedQuote(prev => prev ? { ...prev, to: e.target.value === '' ? null : e.target.value } : null)
                            }
                             disabled={isSubmitting}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="grid gap-2 content-start">
                            <label>Voice Record</label>
                            <Input
                                type="file"
                                accept="audio/*"
                                onChange={handleAudioFileChange}
                                disabled={isSubmitting}
                            />
                             {(audioPreview || (editedQuote.voice_record && !editedQuote.clearVoice)) && (
                               <div className="relative bg-gray-50 p-4 rounded-md border border-gray-200">
                                <audio
                                    controls
                                    src={audioPreview || editedQuote.voice_record || ''}
                                    className="w-full"
                                />
                                <button
                                    type="button"
                                    onClick={clearAudio}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-md"
                                    aria-label="Clear or remove audio"
                                    disabled={isSubmitting}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                               </div>
                             )}
                             {!audioPreview && (!editedQuote.voice_record || editedQuote.clearVoice) && (
                                <div className="bg-gray-100 p-4 rounded-md border border-gray-200 h-[68px] flex items-center justify-center">
                                    <span className="text-sm text-gray-500">No audio</span>
                                </div>
                             )}
                        </div>

                        <div className="grid gap-2 content-start">
                             <label>Scene Image</label>
                             <Input
                                type="file"
                                accept="image/*"
                                onChange={handleImageFileChange}
                                disabled={isSubmitting}
                             />
                             {(imagePreview || (editedQuote.image && !editedQuote.clearImage)) && (
                               <div className="relative group bg-gray-50 p-4 rounded-md border border-gray-200 aspect-video flex items-center justify-center">
                                <Image
                                    src={imagePreview || editedQuote.image || ''}
                                    alt="Preview"
                                    layout="fill"
                                    objectFit="contain"
                                    className="rounded-md cursor-pointer transition-opacity group-hover:opacity-70"
                                    unoptimized={true}
                                    onClick={openImageModal}
                                    onError={(e) => { 
                                        e.currentTarget.style.display = 'none'; 
                                    }}
                                />
                                <div
                                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                                    onClick={openImageModal}
                                >
                                    <Eye className="w-10 h-10 text-white" />
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                                    className="absolute -top-2 -right-2 z-10 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-md"
                                    aria-label="Clear or remove image"
                                    disabled={isSubmitting}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                               </div>
                            )}
                             { !imagePreview && (!editedQuote.image || editedQuote.clearImage) && (
                                <div className="bg-gray-100 p-4 rounded-md border border-gray-200 aspect-video flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-gray-400" />
                                </div>
                             )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeEditDialog} type="button" disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save changes'}
                    </Button>
                </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="p-4 flex justify-center items-center">
            {(imagePreview || (editedQuote?.image && !editedQuote?.clearImage)) && (
              <Image
                src={imagePreview || editedQuote?.image || ''}
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

      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the quote &quot;{selectedQuoteForDelete?.quote.substring(0, 50)}...&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 