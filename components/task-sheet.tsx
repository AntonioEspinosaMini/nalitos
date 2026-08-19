'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useCurrentUser } from '@/lib/user-context';
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '@/lib/labels';
import type { Assignee, Task, TaskCategory, TaskPriority, TaskStatus, Vendor } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Segmented } from './ui/segmented';
import { ConfirmButton } from './ui/confirm-button';
import { Field, FieldRow, Input, Select, Textarea } from './ui/form';

interface TaskSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = alta nueva. */
  task: Task | null;
  vendors: Vendor[];
  /** Responsable por defecto al crear (el de la vista en la que estás). */
  defaultAssignee?: Assignee;
  /** Proveedor al que queda enganchada la tarea al crearla desde su ficha. */
  defaultVendorId?: string | null;
}

export function TaskSheet({
  open,
  onClose,
  task,
  vendors,
  defaultAssignee,
  defaultVendorId = null,
}: TaskSheetProps) {
  const { saveTask, deleteTask } = useData();
  const user = useCurrentUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<Assignee>('Ambos');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('media');
  const [status, setStatus] = useState<TaskStatus>('pendiente');
  const [category, setCategory] = useState<TaskCategory>('otros');
  const [vendorId, setVendorId] = useState<string>('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setAssignee(task.assigned_to);
      setDueDate(task.due_date ?? '');
      setPriority(task.priority);
      setStatus(task.status);
      setCategory(task.category);
      setVendorId(task.vendor_id ?? '');
      setShowAll(true);
    } else {
      setTitle('');
      setDescription('');
      setAssignee(defaultAssignee ?? user);
      setDueDate('');
      setPriority('media');
      setStatus('pendiente');
      setCategory('otros');
      setVendorId(defaultVendorId ?? '');
      setShowAll(false);
    }
  }, [open, task, defaultAssignee, defaultVendorId, user]);

  async function submit() {
    if (!title.trim()) return;
    await saveTask(
      {
        id: task?.id,
        title,
        description: description || null,
        assigned_to: assignee,
        due_date: dueDate || null,
        priority,
        status,
        category,
        vendor_id: vendorId || null,
      },
      user
    );
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      footer={
        <div className="flex gap-2">
          {task && (
            <ConfirmButton
              onConfirm={() => {
                void deleteTask(task.id);
                onClose();
              }}
            />
          )}
          <Button className="flex-1" disabled={!title.trim()} onClick={() => void submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Tarea">
          <Input
            autoFocus={!task}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Firmar contrato del catering"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) void submit();
            }}
          />
        </Field>

        <Field label="Responsable">
          <Segmented
            value={assignee}
            onChange={setAssignee}
            options={[
              { value: 'Antonio', label: 'Antonio' },
              { value: 'Carmen', label: 'Carmen' },
              { value: 'Ambos', label: 'Ambos' },
            ]}
          />
        </Field>

        {!showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Más datos
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-4 animate-in-up">
            <Field label="Estado">
              <Segmented
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'pendiente', label: TASK_STATUS_LABEL.pendiente },
                  { value: 'en_progreso', label: 'En curso' },
                  { value: 'completada', label: 'Hecha' },
                ]}
              />
            </Field>

            <Field label="Prioridad">
              <Segmented
                value={priority}
                onChange={setPriority}
                options={[
                  { value: 'baja', label: TASK_PRIORITY_LABEL.baja },
                  { value: 'media', label: TASK_PRIORITY_LABEL.media },
                  { value: 'alta', label: TASK_PRIORITY_LABEL.alta },
                ]}
              />
            </Field>

            <FieldRow>
              <Field label="Fecha límite">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field label="Categoría">
                <Select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
                  {TASK_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {TASK_CATEGORY_LABEL[item]}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldRow>

            {vendors.length > 0 && (
              <Field label="Proveedor">
                <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Descripción">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles, enlaces, lo que haga falta…"
              />
            </Field>
          </div>
        )}
      </div>
    </Sheet>
  );
}
