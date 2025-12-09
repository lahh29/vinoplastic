
'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useCollection, useFirestore, useStorage, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Upload, File, CheckCircle, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useRoleCheck } from '@/hooks/use-role-check';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interfaces
interface CursoCatalogo {
  id: string;
  id_curso: string;
  nombre_oficial: string;
  url_pdf?: string;
}

export default function CursosPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { isAdmin } = useRoleCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState<{ id: string, progress: number } | null>(null);

  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
  const { data: catalogoCursos, isLoading: loadingCursos } = useCollection<CursoCatalogo>(catalogoCursosRef);

  const filteredCursos = useMemo(() => {
    if (!catalogoCursos) return [];
    return catalogoCursos.filter(curso =>
      curso.nombre_oficial.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos, searchTerm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, curso: CursoCatalogo) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Acción no permitida' });
      return;
    }
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf' && storage) {
      handleUpload(file, curso);
    } else if (file) {
      toast({ variant: 'destructive', title: 'Archivo inválido', description: 'Por favor, selecciona un archivo PDF.' });
    }
  };

  const handleUpload = (file: File, curso: CursoCatalogo) => {
    const storageRef = ref(storage, `cursos/${curso.id_curso}.pdf`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadingFile({ id: curso.id, progress: 0 });

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadingFile({ id: curso.id, progress });
      },
      (error) => {
        console.error("Upload error:", error);
        toast({ variant: 'destructive', title: 'Error de subida', description: 'No se pudo subir el archivo.' });
        setUploadingFile(null);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const cursoDocRef = doc(firestore, 'catalogo_cursos', curso.id);
        await setDoc(cursoDocRef, { url_pdf: downloadURL }, { merge: true });

        toast({
          title: '¡Éxito!',
          description: `El PDF para "${curso.nombre_oficial}" se ha subido correctamente.`,
          className: "bg-green-100 text-green-800 border-green-300",
        });
        setUploadingFile(null);
      }
    );
  };
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-3xl font-bold">Gestión de Archivos de Cursos</CardTitle>
              <CardDescription>
                Administra los materiales PDF para cada curso del catálogo.
              </CardDescription>
            </div>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar curso por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
            {isLoadingCursos ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {filteredCursos.map(curso => (
                  <motion.div 
                    key={curso.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                  <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                    <div className="flex-1 mb-4 sm:mb-0">
                      <h3 className="font-semibold">{curso.nombre_oficial}</h3>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        {curso.url_pdf ? (
                          <a href={curso.url_pdf} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-500 hover:underline">
                            <CheckCircle className="h-4 w-4 mr-1" /> PDF Cargado
                          </a>
                        ) : (
                          <div className="flex items-center text-muted-foreground">
                            <File className="h-4 w-4 mr-1" /> Sin PDF
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        {uploadingFile?.id === curso.id ? (
                            <div className="w-full sm:w-40 text-center">
                                <Progress value={uploadingFile.progress} className="h-2"/>
                                <p className="text-xs mt-1 text-muted-foreground">Subiendo...</p>
                            </div>
                        ) : (
                        <>
                            <input
                                type="file"
                                ref={el => (fileInputRef.current[curso.id] = el)}
                                onChange={(e) => handleFileChange(e, curso)}
                                className="hidden"
                                accept="application/pdf"
                                disabled={!isAdmin}
                            />
                            <Button 
                                variant={curso.url_pdf ? "outline" : "default"} 
                                onClick={() => fileInputRef.current[curso.id]?.click()}
                                disabled={!isAdmin}
                                className="w-full sm:w-auto"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {curso.url_pdf ? 'Reemplazar PDF' : 'Subir PDF'}
                            </Button>
                        </>
                        )}
                    </div>
                  </Card>
                  </motion.div>
                ))}
              </div>
            )}
            {!isLoadingCursos && filteredCursos.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                    <p>No se encontraron cursos que coincidan con tu búsqueda.</p>
                </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
