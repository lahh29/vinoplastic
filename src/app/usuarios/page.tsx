
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
import { Search, Trash2, Edit, CheckSquare, Eye, Loader2, Link2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCollection, useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRoleCheck } from '@/hooks/use-role-check';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface UserData {
    id: string; // Corresponds to UID
    email: string;
    nombre?: string;
    role: 'admin' | 'lector';
    id_empleado?: string;
}

interface Empleado {
    id: string;
    id_empleado: string;
    nombre_completo: string;
}

export default function UsuariosPage() {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isAdmin, checkAdminAndExecute } = useRoleCheck();

    const usuariosRef = useMemoFirebase(() => collection(firestore, 'usuarios'), [firestore]);
    const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);

    const { data: users, isLoading: loadingUsers } = useCollection<UserData>(usuariosRef);
    const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);
    
    const { data: currentUserData, isLoading: isLoadingCurrentUser } = useDoc<UserData>(
        useMemoFirebase(() => currentUser ? doc(firestore, 'usuarios', currentUser.uid) : null, [currentUser, firestore])
    );
    const isLoading = loadingUsers || loadingEmpleados || isLoadingCurrentUser;

    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<UserData> | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
    const [isEmpleadoPopoverOpen, setIsEmpleadoPopoverOpen] = useState(false);


    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user =>
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.id_empleado?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const openEditDialog = (user: UserData) => {
        checkAdminAndExecute(() => {
            setSelectedUser({ ...user });
            setIsEditing(true);
        });
    };

    const closeDialogs = () => {
        setSelectedUser(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
      checkAdminAndExecute(async () => {
        if (!selectedUser || !selectedUser.id || !firestore) return;
        setIsSubmitting(true);

        try {
            const userDocRef = doc(firestore, 'usuarios', selectedUser.id);
            const dataToSave = {
                nombre: selectedUser.nombre || '',
                role: selectedUser.role || 'lector',
                id_empleado: selectedUser.id_empleado || ''
            };
            
            await setDoc(userDocRef, dataToSave, { merge: true });

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
      });
    };

    const handleDelete = (user: UserData) => {
        checkAdminAndExecute(() => {
            if (user.id === currentUser?.uid) {
                toast({
                    variant: 'destructive',
                    title: 'Acción no permitida',
                    description: 'No puedes eliminar tu propia cuenta de usuario.',
                });
                return;
            }
            setUserToDelete(user);
        });
    };

    const confirmDelete = async () => {
      checkAdminAndExecute(async () => {
        if (!userToDelete || !firestore) return;
        setIsSubmitting(true);
        try {
            const userDocRef = doc(firestore, 'usuarios', userToDelete.id);
            await deleteDoc(userDocRef);
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
      });
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
       <div className="flex justify-between items-start">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Gestión de Usuarios</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
                Administra los roles, permisos y la vinculación de empleados a sus cuentas de usuario.
                </p>
            </div>
            {isAdmin && (
                <div className="text-sm p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg max-w-sm">
                   <p className="font-bold mb-1">Flujo de Trabajo:</p>
                   <ol className="list-decimal list-inside text-xs space-y-1">
                       <li>Crea el usuario en la <strong>Consola de Firebase &rarr; Authentication</strong>.</li>
                       <li>Regresa aquí, edita el nuevo usuario y vincúlalo a un empleado.</li>
                   </ol>
                </div>
            )}
       </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <div className="flex justify-between items-center">
            <CardDescription>
                {isLoading ? 'Cargando usuarios...' : `Listado de usuarios con acceso a la plataforma.`}
            </CardDescription>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Buscar por correo, rol, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full w-full max-w-xs"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol Asignado</TableHead>
                  <TableHead>Empleado Vinculado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Cargando datos de usuarios...</TableCell></TableRow>
                ) : filteredUsers.map((user) => {
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
                                {user.id_empleado ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <Link2 className="h-4 w-4" />
                                        <span className="text-sm font-medium">{user.id_empleado}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-amber-600 italic">Sin vincular</span>
                                )}
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
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>
                        Modificando permisos y datos para {selectedUser?.email}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nombre" className="text-right">Nombre</Label>
                        <Input id="nombre" value={selectedUser?.nombre || ''} onChange={(e) => setSelectedUser(prev => prev ? {...prev, nombre: e.target.value} : null)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Rol</Label>
                        <Select value={selectedUser?.role} onValueChange={(value: 'admin' | 'lector') => setSelectedUser(prev => prev ? {...prev, role: value} : null)}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccionar un rol" /></SelectTrigger>
                            <SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="lector">Lector</SelectItem></SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="id_empleado" className="text-right">Vincular Empleado</Label>
                        <Popover open={isEmpleadoPopoverOpen} onOpenChange={setIsEmpleadoPopoverOpen}>
                            <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className={cn("w-auto justify-between col-span-3", !selectedUser?.id_empleado && "text-muted-foreground")}>
                                {selectedUser?.id_empleado
                                ? empleados?.find(emp => emp.id_empleado === selectedUser.id_empleado)?.nombre_completo
                                : "Selecciona un empleado para vincular"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar por nombre o ID..." />
                                <CommandList>
                                    <ScrollArea className="h-64">
                                        <CommandEmpty>No se encontró el empleado.</CommandEmpty>
                                        <CommandGroup>
                                            {empleados?.map(emp => (
                                                <CommandItem
                                                    value={`${emp.nombre_completo} ${emp.id_empleado}`}
                                                    key={emp.id}
                                                    onSelect={() => {
                                                        setSelectedUser(prev => prev ? {...prev, id_empleado: emp.id_empleado} : null);
                                                        setIsEmpleadoPopoverOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", emp.id_empleado === selectedUser?.id_empleado ? "opacity-100" : "opacity-0")} />
                                                    <span>{emp.nombre_completo} <span className="text-xs text-muted-foreground ml-2">ID: {emp.id_empleado}</span></span>
                                                </CommandItem>
                                            ))}
                                        </ScrollArea>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            </PopoverContent>
                        </Popover>
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
