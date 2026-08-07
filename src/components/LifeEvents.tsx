import { useMemo, useRef, useState } from 'react'
import type { FamilyMember, LifeEvent, LifeEventType } from '../types'
import { updateMember } from '../services/firestoreService'
import { uploadEventPhoto } from '../services/storageService'

interface LifeEventsProps {
  member: FamilyMember
  canEdit: boolean
  onUpdated: (updated: FamilyMember) => void
}

const TYPE_LABEL: Record<LifeEventType, string> = {
  birth: 'Birth',
  relocation: 'Relocation',
  marriage: 'Marriage',
  death: 'Death',
}

function formatDate(iso?: string): string {
  if (!iso) return 'Date unknown'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function summary(ev: LifeEvent): string {
  switch (ev.type) {
    case 'birth':
      return ev.place ? `Born in ${ev.place}` : 'Born'
    case 'relocation':
      if (ev.fromPlace && ev.toPlace) return `Moved from ${ev.fromPlace} to ${ev.toPlace}`
      if (ev.toPlace) return `Moved to ${ev.toPlace}`
      if (ev.fromPlace) return `Left ${ev.fromPlace}`
      return 'Relocated'
    case 'marriage':
      return ev.spouseName ? `Married ${ev.spouseName}` : 'Married'
    case 'death':
      return ev.place ? `Died · buried in ${ev.place}` : 'Died'
  }
}

function EventIcon({ type }: { type: LifeEventType }) {
  switch (type) {
    case 'birth':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="15" r="4" />
          <path d="M12 3v3M5 8l2 2M19 8l-2 2M3 15h3M18 15h3" />
        </svg>
      )
    case 'relocation':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18c4-9 8-9 12-14" />
          <path d="M11 4h5v5" />
        </svg>
      )
    case 'marriage':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="14" r="5" />
          <circle cx="15" cy="14" r="5" />
        </svg>
      )
    case 'death':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 3c5 .3 7 3.3 6.6 8.2-.4 4.6-3.3 8.3-6.6 9.3-1-4.3-.6-12.9 0-17.5Z" />
          <path d="M7 21c2-4.3 4.3-9.6 6-14.5" />
        </svg>
      )
  }
}

const EDIT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const DELETE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
)

export default function LifeEvents({ member, canEdit, onUpdated }: LifeEventsProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formType, setFormType] = useState<LifeEventType>('birth')
  const [formDate, setFormDate] = useState('')
  const [formPlace, setFormPlace] = useState('')
  const [formFromPlace, setFormFromPlace] = useState('')
  const [formToPlace, setFormToPlace] = useState('')
  const [formSpouseName, setFormSpouseName] = useState('')
  const [formDetails, setFormDetails] = useState('')
  const [formSpousePhotoURL, setFormSpousePhotoURL] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const spouseFileRef = useRef<HTMLInputElement>(null)

  const sortedEvents = useMemo(() => {
    const events = member.events ?? []
    return [...events].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })
  }, [member.events])

  const openAddForm = () => {
    setEditingId(null)
    setFormOpen(true)
    setFormType('birth')
    setFormDate('')
    setFormPlace('')
    setFormFromPlace('')
    setFormToPlace('')
    setFormSpouseName('')
    setFormDetails('')
    setFormSpousePhotoURL('')
    setErrorMessage('')
  }

  const openEditForm = (ev: LifeEvent) => {
    setFormOpen(false)
    setEditingId(ev.id)
    setFormType(ev.type)
    setFormDate(ev.date ?? '')
    setFormPlace(ev.type === 'birth' || ev.type === 'death' ? ev.place ?? '' : '')
    setFormFromPlace(ev.type === 'relocation' ? ev.fromPlace ?? '' : '')
    setFormToPlace(ev.type === 'relocation' ? ev.toPlace ?? '' : '')
    setFormSpouseName(ev.type === 'marriage' ? ev.spouseName ?? '' : '')
    setFormDetails(ev.type === 'marriage' ? ev.details ?? '' : '')
    setFormSpousePhotoURL(ev.type === 'marriage' ? ev.spousePhotoURL ?? '' : '')
    setErrorMessage('')
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
  }

  const buildEvent = (): LifeEvent => {
    const id = editingId ?? crypto.randomUUID()
    const date = formDate || undefined
    switch (formType) {
      case 'birth':
        return { id, type: 'birth', date, place: formPlace.trim() || undefined }
      case 'relocation':
        return {
          id, type: 'relocation', date,
          fromPlace: formFromPlace.trim() || undefined,
          toPlace: formToPlace.trim() || undefined,
        }
      case 'marriage':
        return {
          id, type: 'marriage', date,
          spouseName: formSpouseName.trim() || undefined,
          details: formDetails.trim() || undefined,
          spousePhotoURL: formSpousePhotoURL || undefined,
        }
      case 'death':
        return { id, type: 'death', date, place: formPlace.trim() || undefined }
    }
  }

  const handleSaveEvent = async () => {
    try {
      setSaving(true)
      setErrorMessage('')
      const newEvent = buildEvent()
      const events = member.events ?? []
      const nextEvents = editingId
        ? events.map(e => (e.id === editingId ? newEvent : e))
        : [...events, newEvent]
      await updateMember({ id: member.id, events: nextEvents })
      onUpdated({ ...member, events: nextEvents })
      closeForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save this event.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this life event?')) return
    try {
      setErrorMessage('')
      const nextEvents = (member.events ?? []).filter(e => e.id !== id)
      await updateMember({ id: member.id, events: nextEvents })
      onUpdated({ ...member, events: nextEvents })
      if (editingId === id) closeForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete this event.')
    }
  }

  const handleSpousePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhotoUploading(true)
      setErrorMessage('')
      const url = await uploadEventPhoto(member.id, editingId ?? 'new', file)
      setFormSpousePhotoURL(url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Photo upload failed.')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  const renderForm = () => (
    <div className="event-form">
      <div className="event-form-row">
        <select value={formType} onChange={e => setFormType(e.target.value as LifeEventType)}>
          <option value="birth">Birth</option>
          <option value="relocation">Relocation</option>
          <option value="marriage">Marriage</option>
          <option value="death">Death</option>
        </select>
        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
      </div>

      {(formType === 'birth' || formType === 'death') && (
        <input
          value={formPlace}
          onChange={e => setFormPlace(e.target.value)}
          placeholder={formType === 'birth' ? 'Place of birth' : 'Burial place'}
        />
      )}

      {formType === 'relocation' && (
        <div className="event-form-row">
          <input value={formFromPlace} onChange={e => setFormFromPlace(e.target.value)} placeholder="From" />
          <input value={formToPlace} onChange={e => setFormToPlace(e.target.value)} placeholder="To" />
        </div>
      )}

      {formType === 'marriage' && (
        <>
          <input value={formSpouseName} onChange={e => setFormSpouseName(e.target.value)} placeholder="Spouse's name" />
          <textarea
            value={formDetails}
            onChange={e => setFormDetails(e.target.value)}
            placeholder="Details about the marriage…"
          />
          <div className="event-photo-row">
            {formSpousePhotoURL && <img className="event-photo" src={formSpousePhotoURL} alt="" />}
            <button
              type="button"
              className="btn-ghost sm"
              onClick={() => spouseFileRef.current?.click()}
              disabled={photoUploading}
            >
              {photoUploading ? 'Uploading…' : formSpousePhotoURL ? 'Change photo' : 'Add photo'}
            </button>
            <input ref={spouseFileRef} type="file" accept="image/*" hidden onChange={handleSpousePhotoChange} />
          </div>
        </>
      )}

      <div className="event-form-actions">
        <button className="btn-ghost sm" onClick={closeForm}>Cancel</button>
        <button className="btn-primary sm" onClick={handleSaveEvent} disabled={saving}>
          {saving ? 'Saving…' : 'Save event'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="field">
      <div className="lab">Life events</div>

      {sortedEvents.length === 0 && !formOpen && (
        <div className="val empty">No life events recorded yet</div>
      )}

      <div className="events-list">
        {sortedEvents.map(ev => (
          editingId === ev.id ? (
            <div key={ev.id}>{renderForm()}</div>
          ) : (
            <div className="event-row" key={ev.id}>
              <div className="event-icon"><EventIcon type={ev.type} /></div>
              <div className="event-body">
                <div className="event-head">
                  <span className="event-type">{TYPE_LABEL[ev.type]}</span>
                  <span className="event-date">{formatDate(ev.date)}</span>
                </div>
                <div className="event-summary">{summary(ev)}</div>
                {ev.type === 'marriage' && ev.spousePhotoURL && (
                  <img className="event-photo" src={ev.spousePhotoURL} alt="" />
                )}
                {ev.type === 'marriage' && ev.details && (
                  <div className="event-summary">{ev.details}</div>
                )}
              </div>
              {canEdit && (
                <div className="event-actions">
                  <button onClick={() => openEditForm(ev)} aria-label="Edit event">{EDIT_ICON}</button>
                  <button onClick={() => handleDelete(ev.id)} aria-label="Delete event">{DELETE_ICON}</button>
                </div>
              )}
            </div>
          )
        ))}
        {formOpen && renderForm()}
      </div>

      {errorMessage && <div className="p-err">{errorMessage}</div>}

      {canEdit && !formOpen && !editingId && (
        <button className="btn-ghost sm event-add" onClick={openAddForm}>+ Add life event</button>
      )}
    </div>
  )
}
