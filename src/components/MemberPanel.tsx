import { useState, useRef } from 'react'
import type { FamilyMember } from '../types'
import type { Role } from '../types'
import { updateMember } from '../services/firestoreService'
import { uploadMemberPhoto } from '../services/storageService'

interface MemberPanelProps {
  member: FamilyMember
  role: Role
  onClose: () => void
  onUpdated: (updated: FamilyMember) => void
}

export default function MemberPanel({ member, role, onClose, onUpdated }: MemberPanelProps) {
  const canEdit = role === 'editor' || role === 'admin'

  const [location, setLocation] = useState(member.location ?? '')
  const [birthYear, setBirthYear] = useState(member.birthYear?.toString() ?? '')
  const [bio, setBio] = useState(member.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    try {
      setSaving(true)
      setErrorMessage('')
      const updated: FamilyMember = {
        ...member,
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(birthYear ? { birthYear: parseInt(birthYear) } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
      }
      await updateMember(updated)
      onUpdated(updated)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save member changes.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setPhotoUploading(true)
      setErrorMessage('')
      const url = await uploadMemberPhoto(member.id, file)
      const updated = { ...member, photoURL: url }
      onUpdated(updated)
      await updateMember(updated)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Photo upload failed.')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white/95 shadow-2xl z-50 flex flex-col border-l border-amber-100 backdrop-blur-xl">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-700 to-amber-600 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-100">Family member</p>
            <h2 className="text-xl font-bold truncate">{member.name}</h2>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white text-2xl leading-none">&times;</button>
        </div>
      </div>

      <div className="bg-gradient-to-b from-amber-50 to-white border-b border-amber-100">
        <div className="relative w-full h-56 bg-amber-100 overflow-hidden">
          {member.photoURL ? (
            <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white bg-gradient-to-br from-amber-300 to-amber-500">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-amber-900">ID {member.id}</span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-stone-700">{canEdit ? 'Editable' : 'View only'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center py-4">
          {canEdit && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoUploading}
                className="text-sm text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
              >
                {photoUploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </>
          )}
          {errorMessage && (
            <p className="mt-2 px-4 text-center text-xs text-rose-600">{errorMessage}</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <Field
          label="Location"
          value={location}
          onChange={setLocation}
          canEdit={canEdit}
          placeholder="e.g. Paris, France"
        />
        <Field
          label="Birth Year"
          value={birthYear}
          onChange={setBirthYear}
          canEdit={canEdit}
          placeholder="e.g. 1952"
          type="number"
        />
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Bio / Notes</label>
          {canEdit ? (
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Add a note about this family member…"
            />
          ) : (
            <p className="text-sm text-gray-700">{bio || <span className="text-gray-400 italic">No notes yet</span>}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="px-5 py-4 border-t border-amber-100 bg-white">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-xl disabled:opacity-50 transition shadow-sm"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}

function Field({
  label, value, onChange, canEdit, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  canEdit: boolean
  placeholder: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      {canEdit ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-amber-100 bg-amber-50/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      ) : (
        <p className="text-sm text-stone-700 rounded-xl bg-stone-50 px-3 py-2">
          {value || <span className="text-gray-400 italic">Not set</span>}
        </p>
      )}
    </div>
  )
}
