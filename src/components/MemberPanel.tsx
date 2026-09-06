import { useMemo, useRef, useState } from 'react'
import type { FamilyMember, Role } from '../types'
import { updateMember } from '../services/firestoreService'
import { uploadMemberPhoto } from '../services/storageService'
import { avatarGradient, genName, initials } from '../utils/style'
import LifeEvents from './LifeEvents'

interface MemberPanelProps {
  member: FamilyMember
  role: Role
  membersMap: Map<string, FamilyMember>
  onClose: () => void
  onUpdated: (updated: FamilyMember) => void
  onNavigate: (id: string) => void
}

export default function MemberPanel({
  member, role, membersMap, onClose, onUpdated, onNavigate,
}: MemberPanelProps) {
  const canEdit = role === 'editor' || role === 'admin'

  const [editing, setEditing] = useState(false)
  const [location, setLocation] = useState(member.location ?? '')
  const [birthYear, setBirthYear] = useState(member.birthYear?.toString() ?? '')
  const [bio, setBio] = useState(member.bio ?? '')
  const [isPublicFigure, setIsPublicFigure] = useState(member.isPublicFigure ?? false)
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const depth = useMemo(() => {
    let d = 0
    let m: FamilyMember | undefined = member
    while (m && m.parentId) {
      d++
      m = membersMap.get(m.parentId)
    }
    return d
  }, [member, membersMap])

  const isFounder = member.parentId === null
  const parent = member.parentId ? membersMap.get(member.parentId) : undefined
  const hasDied = member.events?.some(ev => ev.type === 'death') ?? false
  const children = useMemo(
    () => [...membersMap.values()].filter(m => m.parentId === member.id),
    [membersMap, member.id],
  )

  const heroBg = isFounder
    ? 'linear-gradient(155deg, #b0873f, #7a5a24 80%)'
    : 'linear-gradient(155deg, var(--pine), #123a2f 78%)'

  const resetFields = () => {
    setLocation(member.location ?? '')
    setBirthYear(member.birthYear?.toString() ?? '')
    setBio(member.bio ?? '')
    setIsPublicFigure(member.isPublicFigure ?? false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setErrorMessage('')
      const updated: FamilyMember = {
        ...member,
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(birthYear ? { birthYear: parseInt(birthYear) } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        isPublicFigure,
      }
      await updateMember(updated)
      onUpdated(updated)
      setEditing(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save changes.')
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
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel">
        <div className="p-hero" style={{ background: heroBg }}>
          <button className="x" onClick={onClose} aria-label="Close">&times;</button>
          <div className="pav" style={{ background: avatarGradient(member.name) }}>
            {member.photoURL ? <img src={member.photoURL} alt="" /> : initials(member.name)}
          </div>
          <h2>{member.name}</h2>
          <div className="rel">{isFounder ? 'Family founder' : `Child of ${parent?.name ?? '—'}`}</div>
          <div className="p-badges">
            <span className="p-badge">{genName(depth)}</span>
            <span className="p-badge">
              {children.length
                ? `${children.length} ${children.length > 1 ? 'children' : 'child'}`
                : 'No children'}
            </span>
            <span className="p-badge brass">{canEdit ? 'Editable' : 'View only'}</span>
            {hasDied && <span className="p-badge">In memoriam</span>}
          </div>
        </div>

        <div className="p-body">
          <div className="field">
            <div className="lab">Born</div>
            {editing ? (
              <input
                type="number"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                placeholder="1958"
              />
            ) : (
              <div className={`val serif${member.birthYear ? '' : ' empty'}`}>
                {member.birthYear ?? 'Not recorded'}
              </div>
            )}
          </div>

          <div className="field">
            <div className="lab">Location</div>
            {editing ? (
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Yerevan, Armenia"
              />
            ) : (
              <div className={`val${member.location ? '' : ' empty'}`}>
                {member.location ?? 'Not recorded'}
              </div>
            )}
          </div>

          <div className="field">
            <div className="lab">Memory &amp; notes</div>
            {editing ? (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Add a memory about this person…"
              />
            ) : member.bio ? (
              <div className="quote">{member.bio}</div>
            ) : (
              <div className="val empty">No memory recorded yet</div>
            )}
          </div>

          {canEdit && (
            <div className="field">
              <div className="lab">Public figure</div>
              {editing ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={isPublicFigure}
                    onChange={e => setIsPublicFigure(e.target.checked)}
                  />
                  Allow web lookups about this person
                </label>
              ) : (
                <div className={`val${member.isPublicFigure ? '' : ' empty'}`}>
                  {member.isPublicFigure ? 'Yes — web lookups allowed' : 'No — site data only'}
                </div>
              )}
            </div>
          )}

          <LifeEvents member={member} canEdit={canEdit} onUpdated={onUpdated} />

          {children.length > 0 && (
            <div className="field">
              <div className="lab">Children</div>
              <div className="children">
                {children.map(c => (
                  <button key={c.id} className="mini" onClick={() => onNavigate(c.id)}>
                    <span className="m-ava" style={{ background: avatarGradient(c.name) }}>
                      {initials(c.name)}
                    </span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && <div className="p-err">{errorMessage}</div>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </div>

        {canEdit && (
          <div className="p-foot">
            {editing ? (
              <>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    resetFields()
                    setEditing(false)
                  }}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => setEditing(true)}>
                  Edit details
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoUploading}
                >
                  {photoUploading ? 'Uploading…' : 'Add photo'}
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
