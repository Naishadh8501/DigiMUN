import React, { useState, useRef } from 'react';
import { useCommittee } from '@/contexts/CommitteeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Upload, Check, X, Eye, FileUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

export default function ResolutionsPage() {
  const { resolutions, delegates, uploadResolution, reviewResolution, updateDelegateScore } = useCommittee();
  const { userName, isAdmin } = useAuth();
  
  // Upload State
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [authors, setAuthors] = useState<string[]>([]);
  const [signatories, setSignatories] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grading State (EB Only)
  const [marksToAssign, setMarksToAssign] = useState<Record<string, string>>({});

  const toggleAuthor = (country: string) => {
    if (signatories.includes(country)) return; // Can't be both
    setAuthors(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  const toggleSignatory = (country: string) => {
    if (authors.includes(country)) return; // Can't be both
    setSignatories(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !file || authors.length === 0) {
      toast.error('Please provide a title, a PDF file, and at least one author.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('uploaded_by', userName);
    formData.append('authors', JSON.stringify(authors));
    formData.append('signatories', JSON.stringify(signatories));
    formData.append('file', file);

    const success = await uploadResolution(formData);
    
    if (success) {
      toast.success('Resolution submitted successfully to the EB!');
      setTitle('');
      setFile(null);
      setAuthors([]);
      setSignatories([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      toast.error('Failed to upload resolution.');
    }
    setIsUploading(false);
  };

  const handleEBAction = async (resId: string, status: 'approved' | 'rejected') => {
    const marks = parseInt(marksToAssign[resId]) || 0;
    await reviewResolution(resId, status, marks);
    
    // Automatically update the score for all authors if approved
    if (status === 'approved' && marks > 0) {
      const resolution = resolutions.find(r => r.id === resId);
      if (resolution) {
        resolution.authors.forEach(authorName => {
          const delegate = delegates.find(d => d.country === authorName);
          if (delegate) {
            updateDelegateScore(delegate.id, 'documentation', marks);
          }
        });
        toast.success(`Marked +${marks} Documentation for all authors!`);
      }
    }
  };

  // Filter resolutions based on role
  const visibleResolutions = resolutions.filter(r => {
    if (isAdmin) return true;
    // Delegates see approved ones, OR ones they uploaded/authored/signed
    if (r.status === 'approved') return true;
    return r.uploaded_by === userName || r.authors.includes(userName) || r.signatories.includes(userName);
  });

  const pendingQueue = visibleResolutions.filter(r => r.status === 'pending');
  const processedList = visibleResolutions.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Resolutions
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: UPLOAD FORM (For Delegates) */}
        {!isAdmin && (
          <Card className="lg:col-span-1 h-fit border-primary/20 shadow-sm">
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <FileUp className="h-4 w-4 text-primary" /> Submit Draft Resolution
              </CardTitle>
              <CardDescription>Upload a PDF for EB Review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Document Title</label>
                <Input 
                  placeholder="e.g., Draft Resolution 1.1" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Upload PDF</label>
                <Input 
                  type="file" 
                  accept=".pdf" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t">
                <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Select Authors (Sponsors)
                </label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 border rounded-md">
                  {delegates.map(d => (
                    <Badge 
                      key={`auth-${d.id}`}
                      variant={authors.includes(d.country) ? 'default' : 'outline'}
                      className={`cursor-pointer text-[10px] ${signatories.includes(d.country) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => toggleAuthor(d.country)}
                    >
                      {d.country}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Select Signatories
                </label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 border rounded-md">
                  {delegates.map(d => (
                    <Badge 
                      key={`sig-${d.id}`}
                      variant={signatories.includes(d.country) ? 'secondary' : 'outline'}
                      className={`cursor-pointer text-[10px] ${authors.includes(d.country) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => toggleSignatory(d.country)}
                    >
                      {d.country}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                onClick={handleUpload} 
                disabled={isUploading || !title || !file || authors.length === 0}
              >
                {isUploading ? 'Uploading...' : 'Submit to Executive Board'}
                {!isUploading && <Upload className="h-4 w-4 ml-2" />}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* RIGHT COLUMN: RESOLUTION VIEWER */}
        <div className={`space-y-6 ${!isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          
          {/* EB PENDING QUEUE */}
          {isAdmin && pendingQueue.length > 0 && (
            <Card className="border-warning/50">
              <CardHeader className="pb-3 bg-warning/5 border-b border-warning/20">
                <CardTitle className="font-heading text-base text-warning-foreground">
                  Pending Review ({pendingQueue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {pendingQueue.map(res => (
                  <div key={res.id} className="p-4 rounded-lg border bg-card shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{res.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Submitted by {res.uploaded_by} at {res.timestamp}</p>
                      </div>
                      <a href={`${API_URL}/resolutions/download/${res.id}`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="h-8">
                          <Eye className="h-4 w-4 mr-1.5" /> View PDF
                        </Button>
                      </a>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs bg-muted/30 p-3 rounded-md">
                      <div>
                        <span className="font-semibold block mb-1">Authors:</span>
                        <div className="flex flex-wrap gap-1">
                          {res.authors.map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold block mb-1">Signatories:</span>
                        <div className="flex flex-wrap gap-1">
                          {res.signatories.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Documentation Marks:</label>
                        <Input 
                          type="number" 
                          min="0" max="20" 
                          placeholder="0/20"
                          className="w-20 h-8 text-center"
                          value={marksToAssign[res.id] || ''}
                          onChange={e => setMarksToAssign({...marksToAssign, [res.id]: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleEBAction(res.id, 'rejected')}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button size="sm" className="bg-success hover:bg-success/90 text-white" onClick={() => handleEBAction(res.id, 'approved')}>
                          <Check className="h-4 w-4 mr-1" /> Approve & Grade
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* DOCUMENT LIBRARY */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="font-heading text-base">Resolution Library</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {processedList.length === 0 && !(!isAdmin && pendingQueue.length > 0) ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No resolutions have been published yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  
                  {/* Show delegates their pending items at the top of their library */}
                  {!isAdmin && pendingQueue.map(res => (
                    <div key={res.id} className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold truncate pr-2">{res.title}</h4>
                        <Badge variant="outline" className="text-warning border-warning">Pending EB</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">Submitted by {res.uploaded_by}</p>
                      <a href={`${API_URL}/resolutions/download/${res.id}`} target="_blank" rel="noreferrer">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-8">View PDF</Button>
                      </a>
                    </div>
                  ))}

                  {/* Show processed items */}
                  {processedList.map(res => (
                    <div key={res.id} className={`p-4 rounded-lg border ${res.status === 'rejected' ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold truncate pr-2">{res.title}</h4>
                        <Badge variant="outline" className={res.status === 'approved' ? 'text-success border-success' : 'text-destructive border-destructive'}>
                          {res.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-3 space-y-1">
                        <p><strong>Authors:</strong> {res.authors.join(', ') || 'None'}</p>
                        {isAdmin && <p><strong>Marks Awarded:</strong> {res.marks} / 20</p>}
                      </div>

                      <a href={`${API_URL}/resolutions/download/${res.id}`} target="_blank" rel="noreferrer">
                        <Button variant={res.status === 'approved' ? 'default' : 'secondary'} size="sm" className="w-full text-xs h-8">
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Document
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}