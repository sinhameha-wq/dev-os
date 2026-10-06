'use client'

import { create } from 'zustand'

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

interface ContractStore {
  uploadStatus: UploadStatus
  currentContractId: string | null
  targetPage: number | null
  errorMessage: string | null
  setUploadStatus: (status: UploadStatus) => void
  setCurrentContractId: (id: string | null) => void
  setTargetPage: (page: number | null) => void
  setErrorMessage: (message: string | null) => void
  reset: () => void
}

const initial = {
  uploadStatus: 'idle' as UploadStatus,
  currentContractId: null,
  targetPage: null,
  errorMessage: null,
}

export const useContractStore = create<ContractStore>((set) => ({
  ...initial,
  setUploadStatus: (uploadStatus) => set({ uploadStatus }),
  setCurrentContractId: (currentContractId) => set({ currentContractId }),
  setTargetPage: (targetPage) => set({ targetPage }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  reset: () => set(initial),
}))
