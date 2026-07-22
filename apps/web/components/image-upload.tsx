'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud, Video } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Input } from './ui';
import { toast } from '@/lib/auth-store';

async function uploadFile(file: File, purpose: string): Promise<string> {
  // 1) گرفتن presign
  const { data: presign } = await api<{ uploadUrl: string; path: string; publicUrl: string }>(
    '/admin/files/presign',
    { method: 'POST', body: { purpose, mimeType: file.type || 'application/octet-stream', originalName: file.name } },
  );
  // 2) آپلود مستقیم به MinIO/S3
  const res = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error('آپلود فایل ناموفق بود');
  // 3) ثبت فایل
  await api('/files/confirm', {
    method: 'POST',
    body: { purpose, path: presign.path, originalName: file.name, mimeType: file.type, sizeBytes: file.size },
  });
  return presign.path;
}

/**
 * آپلودر تصویر/ویدئو با presign + ورود دستی مسیر (fallback)
 */
export function ImageUpload({
  value, onChange, purpose = 'product_image', kind = 'image', hint,
}: {
  value: string;
  onChange: (path: string) => void;
  purpose?: string;
  kind?: 'image' | 'video';
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadFile(file, purpose);
      onChange(path);
      toast.success('فایل آپلود شد');
    } catch (e) {
      toast.error((e as Error).message || 'آپلود ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" hidden accept={kind === 'video' ? 'video/*' : 'image/*'} onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#10130f]">
        {value ? (
          kind === 'video' ? (
            <Video className="h-6 w-6 text-slate-400" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.startsWith('http') ? value : `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || 'http://localhost:9000/karzintell'}/${value}`} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <ImagePlus className="h-6 w-6 text-slate-300" />
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={hint || 'مسیر فایل (مثل products/xx.webp) یا لینک'} className="text-xs" dir="ltr" />
        <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          <UploadCloud className="h-4 w-4" />
          آپلود
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
