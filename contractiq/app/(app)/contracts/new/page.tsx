'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Upload, FileText, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import type { ContractType } from '@/types'

const STANDARD_TERMS: Record<ContractType, string[]> = {
  NDA: [
    'Parties', 'Effective Date', 'Confidentiality Obligations', 'Permitted Disclosures',
    'Term & Duration', 'Governing Law', 'Jurisdiction', 'IP Ownership',
    'Non-Solicitation', 'Breach & Remedy',
  ],
  MSA: [
    'Parties', 'Service Scope', 'Payment Terms', 'Invoice Schedule', 'Late Payment Penalty',
    'Liability Cap', 'Indemnification', 'IP Ownership', 'Termination Clause',
    'Governing Law', 'Dispute Resolution', 'Notice Period',
  ],
}

type Step = 'upload' | 'preview' | 'processing'

const PROCESSING_STEPS = [
  'Uploading PDF',
  'Extracting text',
  'Analysing with AI',
  'Saving results',
]

export default function NewContractPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [contractType, setContractType] = useState<ContractType>('NDA')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [contractId, setContractId] = useState<string | null>(null)
  const [customTerms, setCustomTerms] = useState<string[]>([])
  const [newTerm, setNewTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)

  const standardTerms = STANDARD_TERMS[contractType]

  // ── File handling ─────────────────────────────────────────────

  function validateFile(f: File): string | null {
    if (f.type !== 'application/pdf') return 'Please upload a PDF file.'
    if (f.size > 10 * 1024 * 1024) return 'File exceeds the 10 MB limit.'
    return null
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    const err = validateFile(dropped)
    if (err) { toast.error(err); return }
    setFile(dropped)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    const err = validateFile(picked)
    if (err) { toast.error(err); return }
    setFile(picked)
  }

  // ── Upload ────────────────────────────────────────────────────

  async function handleUpload() {
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('contractType', contractType)
    formData.append('fileName', file.name)

    try {
      const res = await fetch('/api/contracts/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Upload failed. Please try again.')
        return
      }

      setContractId(json.data.contractId)
      setStep('preview')
    } catch {
      toast.error('Upload failed. Please check your connection.')
    } finally {
      setUploading(false)
    }
  }

  // ── Custom terms ──────────────────────────────────────────────

  function addCustomTerm() {
    const trimmed = newTerm.trim()
    if (!trimmed) return
    if (customTerms.length >= 5) { toast.error('Maximum 5 custom terms.'); return }
    if (customTerms.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This term is already in the list.')
      return
    }
    setCustomTerms((prev) => [...prev, trimmed])
    setNewTerm('')
  }

  function removeCustomTerm(term: string) {
    setCustomTerms((prev) => prev.filter((t) => t !== term))
  }

  // ── Process ───────────────────────────────────────────────────

  async function handleProcess() {
    if (!contractId) return
    setStep('processing')
    setProcessingStep(1)

    // Simulate step progression for UX
    const stepTimer = setInterval(() => {
      setProcessingStep((s) => Math.min(s + 1, PROCESSING_STEPS.length - 1))
    }, 6000)

    try {
      const res = await fetch(`/api/contracts/${contractId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customTerms }),
      })
      const json = await res.json()

      clearInterval(stepTimer)

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Processing failed. Please try again.')
        setStep('preview')
        return
      }

      setProcessingStep(PROCESSING_STEPS.length)
      router.push(`/contracts/${contractId}`)
    } catch {
      clearInterval(stepTimer)
      toast.error('Processing failed. Please check your connection.')
      setStep('preview')
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="font-medium text-grey-900"
          style={{ fontSize: 24, lineHeight: '32px', letterSpacing: 0 }}
        >
          Review a contract
        </h1>
        <p className="mt-1 text-sm text-grey-400">
          Upload an NDA or MSA to extract key terms automatically.
        </p>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="rounded-lg border border-grey-100 bg-white p-8 space-y-6">
          {/* Contract type selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-grey-700" style={{ letterSpacing: 0 }}>
              Contract type
            </p>
            <div className="flex gap-3">
              {(['NDA', 'MSA'] as ContractType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContractType(type)}
                  className={cn(
                    'rounded-md border px-5 py-2 text-sm font-medium transition-colors',
                    contractType === type
                      ? 'border-brand bg-brand-50 text-brand'
                      : 'border-grey-200 text-grey-500 hover:border-grey-300 hover:text-grey-700'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-brand bg-brand-50'
                : file
                ? 'border-success bg-success-50'
                : 'border-grey-200 bg-grey-25 hover:border-grey-300'
            )}
          >
            {file ? (
              <>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success-50 border border-success-100">
                  <FileText size={18} className="text-success" />
                </div>
                <p className="font-medium text-grey-900" style={{ letterSpacing: 0 }}>
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-grey-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="mt-2 text-xs text-grey-400 hover:text-grey-700 transition-colors"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-grey-50 border border-grey-200">
                  <Upload size={18} className="text-grey-400" />
                </div>
                <p className="font-medium text-grey-700" style={{ letterSpacing: 0 }}>
                  {dragOver ? 'Drop to upload' : 'Drop your PDF here, or click to browse'}
                </p>
                <p className="mt-1 text-xs text-grey-400">PDF only · Max 10 MB · Max 20 pages</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading…' : 'Continue →'}
          </Button>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="rounded-lg border border-grey-100 bg-white p-8 space-y-6">
          <div>
            <p className="font-medium text-grey-900" style={{ fontSize: 16, letterSpacing: 0 }}>
              Terms to extract
            </p>
            <p className="mt-1 text-sm text-grey-400">
              {contractType} standard terms below. Add up to {5 - customTerms.length} more custom
              terms before processing.
            </p>
          </div>

          {/* Standard + custom terms */}
          <div className="flex flex-wrap gap-2">
            {standardTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center rounded-sm border border-grey-200 bg-grey-25 px-2.5 py-1 text-xs text-grey-600"
              >
                {term}
              </span>
            ))}
            {customTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1.5 rounded-sm border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs text-brand"
              >
                {term}
                <Badge variant="custom" className="text-[9px] px-1 py-0">Custom</Badge>
                <button
                  type="button"
                  onClick={() => removeCustomTerm(term)}
                  className="ml-0.5 rounded text-brand-400 hover:text-brand transition-colors"
                  aria-label={`Remove ${term}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>

          {/* Add custom term */}
          {customTerms.length < 5 && (
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "Non-compete clause"'
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomTerm() }
                }}
                maxLength={100}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addCustomTerm}
                disabled={!newTerm.trim()}
                title="Add custom term"
              >
                <Plus size={14} />
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('upload')}
              className="flex-1"
            >
              ← Back
            </Button>
            <Button onClick={handleProcess} className="flex-1">
              Process contract
            </Button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="rounded-lg border border-grey-100 bg-white p-12 text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand" />
          <p
            className="font-medium text-grey-900"
            style={{ fontSize: 16, letterSpacing: 0 }}
          >
            Analysing your contract…
          </p>
          <p className="mt-2 text-sm text-grey-400">This takes up to 30 seconds.</p>

          <div className="mt-8 space-y-2 text-left max-w-xs mx-auto">
            {PROCESSING_STEPS.map((label, i) => {
              const done = i < processingStep
              const active = i === processingStep
              return (
                <div key={label} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle size={14} className="text-success shrink-0" />
                  ) : active ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-grey-200 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      done ? 'text-grey-700' : active ? 'text-grey-900 font-medium' : 'text-grey-300'
                    )}
                    style={{ letterSpacing: 0 }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
