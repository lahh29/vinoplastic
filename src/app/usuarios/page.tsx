
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2, Edit, CheckSquare, Eye, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCollection, useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


interface UserData {
    id: string; // Corresponds to UID
    email: string;
    nombre?: string;
    role: 'admin' | 'lector';
}

export default function UsuariosPage() {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const usuariosRef = useMemoFirebase(() => collection(firestore, 'usuarios'), [firestore]);
    const { data: users, isLoading } = useCollection<UserData>(usuariosRef);
    
    // Fetch current user's role
    const currentUserRoleRef = useMemoFirebase(() => currentUser ? doc(firestore, 'usuarios', currentUser.uid) : null, [currentUser, firestore]);
    const { data: currentUserData, isLoading: isLoadingCurrentUser } = useDoc<UserData>(currentUserRoleRef);

    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<UserData> | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

    const isAdmin = currentUserData?.role === 'admin';

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user =>
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const openEditDialog = (user: UserData) => {
        setSelectedUser({ ...user });
        setIsEditing(true);
    };

    const closeDialogs = () => {
        setSelectedUser(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!selectedUser || !selectedUser.id || !firestore) return;
        setIsSubmitting(true);

        try {
            const userDocRef = doc(firestore, 'usuarios', selectedUser.id);
            await setDocumentNonBlocking(userDocRef, {
                nombre: selectedUser.nombre || '',
                role: selectedUser.role || 'lector'
            }, { merge: true });

            toast({
                title: 'Éxito',
                description: `Se ha actualizado el usuario ${selectedUser.email}.`,
                className: "bg-green-100 text-green-800 border-green-300",
            });
            
            closeDialogs();
        } catch (error) {
            console.error("Error guardando usuario:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar el usuario.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (user: UserData) => {
        if (user.id === currentUser?.uid) {
            toast({
                variant: 'destructive',
                title: 'Acción no permitida',
                description: 'No puedes eliminar tu propia cuenta de usuario.',
            });
            return;
        }
        setUserToDelete(user);
    };

    const confirmDelete = async () => {
        if (!userToDelete || !firestore) return;
        setIsSubmitting(true);
        try {
            const userDocRef = doc(firestore, 'usuarios', userToDelete.id);
            await deleteDocumentNonBlocking(userDocRef);
            toast({
                title: 'Usuario Eliminado',
                description: `El rol del usuario ${userToDelete.email} ha sido eliminado. La cuenta de autenticación aún existe.`,
            });
            setUserToDelete(null);
        } catch(error) {
            console.error("Error eliminando usuario:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar el rol del usuario.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    const getAccessLevel = (role: UserData['role']) => {
        switch (role) {
            case 'admin': return { label: 'Acceso Completo', icon: CheckSquare, className: 'text-green-500' };
            case 'lector': return { label: 'Solo Vista', icon: Eye, className: 'text-blue-500' };
            default: return { label: 'Desconocido', icon: Eye, className: 'text-gray-500' };
        }
    };
    
  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Gestión de Usuarios</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                Administra los roles y permisos de acceso a la plataforma.
                </p>
            </div>
            {isAdmin && (
                <div className="text-sm p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md">
                    La creación de usuarios debe realizarse desde la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className='font-bold underline'>Consola de Firebase</a>.
                </div>
            )}
       </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando usuarios...' : `Listado de usuarios con acceso a la plataforma.`}
          </CardDescription>
          <div className="relative pt-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por correo o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol Asignado</TableHead>
                  <TableHead>Nivel de Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isLoadingCurrentUser ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Cargando datos de usuarios...</TableCell></TableRow>
                ) : filteredUsers.map((user) => {
                    const access = getAccessLevel(user.role);
                    return (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div>{user.nombre || 'Sin Nombre Asignado'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className={`flex items-center gap-2 ${access.className}`}>
                                    <access.icon className="h-4 w-4" />
                                    <span>{access.label}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                {isAdmin && (
                                    <>
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} disabled={user.id === currentUser?.uid}>
                                            <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                                            <span className="sr-only">Eliminar</span>
                                        </Button>
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={closeDialogs}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>
                        Modificando permisos para {selectedUser?.email}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nombre" className="text-right">Nombre</Label>
                        <Input id="nombre" value={selectedUser?.nombre || ''} onChange={(e) => setSelectedUser(prev => prev ? {...prev, nombre: e.target.value} : null)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Correo</Label>
                        <Input id="email" value={selectedUser?.email || ''} className="col-span-3" disabled />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Rol</Label>
                        <Select value={selectedUser?.role} onValueChange={(value: 'admin' | 'lector') => setSelectedUser(prev => prev ? {...prev, role: value} : null)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar un rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="lector">Lector</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialogs}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la asignación de rol para el usuario <span className="font-bold">{userToDelete?.email}</span>. No elimina al usuario de Firebase Authentication.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sí, eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
