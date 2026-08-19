'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-context';
import { VENDOR_STATUSES, VENDOR_STATUS_LABEL } from '@/lib/labels';
import type { BudgetCategory, Vendor, VendorStatus } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Field, FieldRow, Input, MoneyInput, Select, Textarea } from './ui/form';

interface VendorSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = alta nueva. */
  vendor: Vendor | null;
  categories: BudgetCategory[];
}

export function VendorSheet({ open, onClose, vendor, categories }: VendorSheetProps) {
  const { saveVendor } = useData();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [web, setWeb] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<VendorStatus>('por_contactar');
  const [hiredDate, setHiredDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(vendor?.name ?? '');
    setCategoryId(vendor?.category_id ?? categories[0]?.id ?? '');
    setContact(vendor?.contact_name ?? '');
    setPhone(vendor?.phone ?? '');
    setEmail(vendor?.email ?? '');
    setWeb(vendor?.web ?? '');
    setPrice(vendor && vendor.price > 0 ? String(vendor.price) : '');
    setStatus(vendor?.status ?? 'por_contactar');
    setHiredDate(vendor?.hired_date ?? '');
    setNotes(vendor?.notes ?? '');
  }, [open, vendor, categories]);

  async function submit() {
    if (!name.trim()) return;
    await saveVendor({
      id: vendor?.id,
      name,
      category_id: categoryId,
      contact_name: contact || null,
      phone: phone || null,
      email: email || null,
      web: web || null,
      price: Number.parseFloat(price) || 0,
      status,
      hired_date: hiredDate || null,
      notes: notes || null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={vendor ? 'Editar proveedor' : 'Nuevo proveedor'}
      footer={
        <Button className="w-full" disabled={!name.trim()} onClick={() => void submit()}>
          Guardar
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre">
          <Input
            autoFocus={!vendor}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Catering La Alameda"
          />
        </Field>

        <FieldRow>
          <Field label="Categoría">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value as VendorStatus)}>
              {VENDOR_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {VENDOR_STATUS_LABEL[item]}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Precio">
            <MoneyInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Contratado el">
            <Input type="date" value={hiredDate} onChange={(e) => setHiredDate(e.target.value)} />
          </Field>
        </FieldRow>

        <Field label="Persona de contacto">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Marta" />
        </Field>

        <FieldRow>
          <Field label="Teléfono">
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="600 000 000"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hola@proveedor.com"
            />
          </Field>
        </FieldRow>

        <Field label="Web">
          <Input value={web} onChange={(e) => setWeb(e.target.value)} placeholder="proveedor.com" />
        </Field>

        <Field label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Qué incluye, condiciones, impresiones…"
          />
        </Field>
      </div>
    </Sheet>
  );
}
