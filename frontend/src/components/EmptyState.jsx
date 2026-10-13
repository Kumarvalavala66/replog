import { Dumbbell } from 'lucide-react'

export default function EmptyState({ title, description, action, onAction }) {
  return (
    <div className="empty empty-state">
      <Dumbbell size={24} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button button-primary" type="button" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}
