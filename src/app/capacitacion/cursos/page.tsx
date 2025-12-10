'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useStorage, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Loader2,
  Upload,
  File as FileIcon,       // 👈 icono renombrado
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
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
  const [uploadingFile, setUploadingFile] = useState<{ id: string; progress: number } | null>(
    null
  );

  const catalogoCursosRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'catalogo_cursos') : null),
    [firestore]
  );

  const { data: catalogoCursos, isLoading } = useCollection<CursoCatalogo>(catalogoCursosRef);

  const filteredCursos = useMemo(() => {
    if (!catalogoCursos) return [];
    const term = searchTerm.toLowerCase();

    return catalogoCursos
      .filter((curso) => curso.nombre_oficial.toLowerCase().includes(term))
      .sort((a, b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos, searchTerm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, curso: CursoCatalogo) => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Acción no permitida',
        description: 'Solo administradores pueden subir archivos.',
      });
      return;
    }

    const file = e.target.files?.[0];

    // Permite volver a seleccionar el mismo archivo si se desea
    e.target.value = '';

    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Formato incorrecto',
        description: 'El archivo debe ser PDF.',
      });
      return;
    }

    if (!storage || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Servicios de Firebase no disponibles.',
      });
      return;
    }

    handleUpload(file, curso);
  };

  const handleUpload = (file: File, curso: CursoCatalogo) => {
    if (!storage || !firestore) return;

    const storageRef = ref(storage, `cursos/${curso.id_curso}.pdf`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadingFile({ id: curso.id, progress: 0 });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadingFile({ id: curso.id, progress });
      },
      (error) => {
        console.error('Error subiendo:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo subir el archivo a Storage.',
        });
        setUploadingFile(null);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const cursoDocRef = doc(firestore, 'catalogo_cursos', curso.id);
          await setDoc(
            cursoDocRef,
            { url_pdf: downloadURL },
            { merge: true }
          );

          toast({
            title: 'Carga completa',
            description: `Material actualizado para: ${curso.nombre_oficial}`,
            className: 'bg-green-100 text-green-800 border-green-300',
          });
        } catch (err) {
          console.error('Error guardando URL:', err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'El archivo se subió, pero no se pudo guardar el enlace.',
          });
        } finally {
          setUploadingFile(null);
        }
      }
    );
  };

  const triggerFileInput = (cursoId: string) => {
    const inputElement = document.getElementById(
      `file-input-${cursoId}`
    ) as HTMLInputElement | null;
    inputElement?.click();
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <Card className="flex-1 flex flex-col rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Material Didáctico</CardTitle>
              <CardDescription>
                Sube o actualiza los manuales PDF de los cursos.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="w-full h-full pr-2 pb-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin" /> Cargando catálogo...
              </div>
            ) : filteredCursos.length > 0 ? (
              <div className="space-y-3">
                {filteredCursos.map((curso) => (
                  <motion.div
                    key={curso.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 w-full sm:w-auto mb-4 sm:mb-0 sm:pr-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm sm:text-base">
                            {curso.nombre_oficial}
                          </h3>
                          {curso.url_pdf && (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs mt-1.5">
                          <span className="text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            ID: {curso.id_curso}
                          </span>

                          {curso.url_pdf ? (
                            <a
                              href={curso.url_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-primary hover:underline font-medium"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" /> Ver PDF actual
                            </a>
                          ) : (
                            <span className="text-muted-foreground flex items-center">
                              <FileIcon className="h-3 w-3 mr-1" /> Sin material
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex flex-col items-end">
                        <input
                          id={`file-input-${curso.id}`}
                          type="file"
                          className="hidden"
                          accept="application/pdf"
                          disabled={!isAdmin || uploadingFile?.id === curso.id}
                          onChange={(e) => handleFileChange(e, curso)}
                        />

                        {uploadingFile?.id === curso.id ? (
                          <div className="w-full sm:w-48">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Subiendo...</span>
                              <span>{Math.round(uploadingFile.progress)}%</span>
                            </div>
                            <Progress value={uploadingFile.progress} className="h-2" />
                          </div>
                        ) : (
                          <Button
                            variant={curso.url_pdf ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => triggerFileInput(curso.id)}
                            disabled={!isAdmin}
                            className="w-full sm:w-auto"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {curso.url_pdf ? 'Actualizar PDF' : 'Subir Archivo'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                <FileIcon className="h-12 w-12 mb-2" />
                <p>No se encontraron cursos.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
