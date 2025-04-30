'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit2, Trash2, Music, Image as ImageIcon } from 'lucide-react'
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
}

const dummyQuotes: Quote[] = [
  {
    id: '1',
    type: 'film',
    quote: 'Hasta la vista, baby',
    character: 'Terminator',
    title: 'The Terminator',
    to: null,
    voice_record: 'path/to/audio1.mp3',
    image: 'path/to/image1.jpg',
  },
  {
    id: '2',
    type: 'game',
    quote: 'War never changes',
    character: 'Narrator',
    title: 'Fallout',
    to: null,
    voice_record: null,
    image: 'path/to/image2.jpg',
  },
  // Add more dummy quotes as needed
]

export function EditQuestionForm() {
  const [quotes, setQuotes] = useState(dummyQuotes)
  const [selectedQuote, setSelectedQuote] = useState<typeof dummyQuotes[0] | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editedQuote, setEditedQuote] = useState<typeof dummyQuotes[0] | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleEdit = (quote: typeof dummyQuotes[0]) => {
    setSelectedQuote(quote)
    setEditedQuote({ ...quote })
    setShowEditDialog(true)
  }

  const handleDelete = (quote: typeof dummyQuotes[0]) => {
    setSelectedQuote(quote)
    setShowDeleteDialog(true)
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file')
        return
      }
      const url = URL.createObjectURL(file)
      setAudioPreview(url)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    }
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedQuote || !selectedQuote) return

    // Update the quotes array with edited quote
    setQuotes(quotes.map(q => 
      q.id === selectedQuote.id ? editedQuote : q
    ))

    // Cleanup and close dialog
    setShowEditDialog(false)
    setSelectedQuote(null)
    setEditedQuote(null)
    if (audioPreview) URL.revokeObjectURL(audioPreview)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setAudioPreview(null)
    setImagePreview(null)
    toast.success('Quote updated successfully')
  }

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    setShowEditDialog(false)
    setSelectedQuote(null)
    setEditedQuote(null)
    if (audioPreview) URL.revokeObjectURL(audioPreview)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setAudioPreview(null)
    setImagePreview(null)
  }

  const handleConfirmDelete = () => {
    if (!selectedQuote) return

    // Remove the quote from the array
    setQuotes(quotes.filter(q => q.id !== selectedQuote.id))
    setShowDeleteDialog(false)
    setSelectedQuote(null)
    toast.success('Quote deleted successfully')
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
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium capitalize">{quote.type}</TableCell>
                <TableCell className="max-w-[200px] truncate">{quote.quote}</TableCell>
                <TableCell>{quote.character}</TableCell>
                <TableCell>{quote.title}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {quote.voice_record && <Music className="w-4 h-4" />}
                    {quote.image && <ImageIcon className="w-4 h-4" />}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(quote)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(quote)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
            <DialogDescription>
              Make changes to the quote here. Click save when you are done.
            </DialogDescription>
          </DialogHeader>
          {editedQuote && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Select
                  value={editedQuote.type}
                  onValueChange={(value: 'film' | 'game') => 
                    setEditedQuote({ ...editedQuote, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="film">Film Quote</SelectItem>
                    <SelectItem value="game">Game Quote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label>Quote</label>
                <Textarea
                  value={editedQuote.quote}
                  onChange={(e) => 
                    setEditedQuote({ ...editedQuote, quote: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label>Character</label>
                  <Input
                    value={editedQuote.character}
                    onChange={(e) => 
                      setEditedQuote({ ...editedQuote, character: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label>Title</label>
                  <Input
                    value={editedQuote.title}
                    onChange={(e) => 
                      setEditedQuote({ ...editedQuote, title: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label>To (Optional)</label>
                <Input
                  value={editedQuote?.to ?? ''}
                  onChange={(e) => 
                    setEditedQuote({ ...editedQuote!, to: e.target.value === '' ? null : e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label>Voice Record</label>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                  />
                  {(audioPreview || editedQuote?.voice_record) && (
                    <audio
                      controls
                      src={audioPreview || editedQuote?.voice_record || ''}
                      className="w-full"
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <label>Scene Image</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {(imagePreview || editedQuote?.image) && (
                    <Image
                      src={imagePreview || editedQuote?.image || ''}
                      alt="Preview"
                      width={400}
                      height={300}
                      className="w-full max-h-[200px] object-contain rounded-md"
                      unoptimized={true}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 