import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItem, getFeatures, updateItem, deleteItem, generateAI, checkFavorite, toggleFavorite, getNotes, addNote, deleteNote } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import AIResultDisplay from '../components/AIResultDisplay';
import { ArrowLeft, Sparkles, Pencil, Trash2, Star, MessageSquare, Send, X } from 'lucide-react';

const STATUS_CLASS = {
  draft: 'badge-draft',
  'in-progress': 'badge-in-progress',
  in_progress: 'badge-in-progress',
  completed: 'badge-completed',
};

export default function ItemDetail() {
  const { featureKey, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [featureMeta, setFeatureMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Favorites
  const [favorited, setFavorited] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const featureLabel = featureKey
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const loadItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getItem(featureKey, id);
      setItem(res.data || res.item || res);
    } catch {
      toast.error('Failed to load item');
      navigate(`/features/${featureKey}`);
    } finally {
      setLoading(false);
    }
  }, [featureKey, id, navigate]);

  const loadNotes = useCallback(async () => {
    try {
      const res = await getNotes(featureKey, id);
      setNotes(res.notes || []);
    } catch {
      // silent
    }
  }, [featureKey, id]);

  const loadFavorite = useCallback(async () => {
    if (!user) return;
    try {
      const res = await checkFavorite(featureKey, id, user.id);
      setFavorited(res.favorited);
    } catch {
      // silent
    }
  }, [featureKey, id, user]);

  useEffect(() => {
    loadItem();
    loadNotes();
    loadFavorite();
  }, [loadItem, loadNotes, loadFavorite]);

  useEffect(() => {
    getFeatures()
      .then((res) => {
        const list = res.data || res.features || res || [];
        const found = list.find((f) => (f.key || f.featureKey) === featureKey);
        if (found) setFeatureMeta(found);
      })
      .catch(() => {});
  }, [featureKey]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateAI(featureKey, id);
      const updated = res.data || res.item || res;
      setItem(updated);
      toast.success('AI analysis generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) return;
    setTogglingFav(true);
    try {
      const res = await toggleFavorite(featureKey, id, user.id);
      setFavorited(res.favorited);
      toast.success(res.favorited ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to toggle favorite');
    } finally {
      setTogglingFav(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      await addNote(featureKey, id, user?.id, noteContent);
      setNoteContent('');
      loadNotes();
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(featureKey, noteId);
      loadNotes();
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const openEdit = () => {
    if (!item) return;
    const data = { ...item };
    delete data._id;
    delete data.id;
    delete data.__v;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.created_at;
    delete data.updated_at;
    delete data.ai_result;
    delete data.aiResult;
    delete data.user;
    delete data.userId;
    delete data.user_id;
    setFormData(data);
    setShowEdit(true);
  };

  const handleFieldChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateItem(featureKey, id, formData);
      setItem(res.data || res.item || res);
      setShowEdit(false);
      toast.success('Item updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem(featureKey, id);
      toast.success('Item deleted');
      navigate(`/features/${featureKey}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const fields = featureMeta?.fields || [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ];

  const INTERNAL = new Set([
    '_id', 'id', '__v', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
    'ai_result', 'aiResult', 'user', 'userId', 'user_id',
  ]);

  const displayFields = item
    ? Object.entries(item).filter(([k]) => !INTERNAL.has(k))
    : [];

  const aiResult = item?.ai_result || item?.aiResult;

  const formatNoteDate = (d) => {
    const date = new Date(d);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
          <div className="skeleton h-64 rounded-xl" />
        </main>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Back */}
        <button
          onClick={() => navigate(`/features/${featureKey}`)}
          className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 animate-fade-in"
        >
          <ArrowLeft size={16} />
          Back to {featureLabel}
        </button>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              {item.name || item.title || 'Untitled'}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className={STATUS_CLASS[item.status] || 'badge-draft'}>
                {(item.status || 'draft').replace(/[_-]/g, ' ')}
              </span>
              <span className="text-sm text-slate-500">
                Created{' '}
                {new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleFavorite}
              disabled={togglingFav}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                favorited
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              } disabled:opacity-60`}
              title={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={16} fill={favorited ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate AI Analysis
                </>
              )}
            </button>
            <button
              onClick={openEdit}
              className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              <Pencil size={16} />
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Item data fields */}
        <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 animate-slide-up">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {displayFields.map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm font-medium text-slate-400">
                  {key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </dt>
                <dd className="mt-1 text-slate-200">
                  {typeof value === 'object' && value !== null
                    ? JSON.stringify(value, null, 2)
                    : String(value ?? '-')}
                </dd>
              </div>
            ))}
          </div>
        </div>

        {/* AI Result */}
        {aiResult && (
          <div className="mb-8 animate-fade-in">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Sparkles size={20} className="text-purple-400" />
              AI Analysis Result
            </h2>
            <AIResultDisplay result={aiResult} />
          </div>
        )}

        {/* Notes section */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 animate-slide-up">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-200">
              Notes ({notes.length})
            </h2>
          </div>

          {/* Add note form */}
          <form onSubmit={handleAddNote} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                className="form-input flex-1"
              />
              <button
                type="submit"
                disabled={addingNote || !noteContent.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {addingNote ? <span className="spinner" /> : <Send size={16} />}
              </button>
            </div>
          </form>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500">No notes yet. Add one above!</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-3 rounded-lg border border-slate-700/30 bg-slate-700/20 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-300">
                        {note.user_name || 'User'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatNoteDate(note.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{note.content}</p>
                  </div>
                  {note.user_id === user?.id && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit modal */}
        {showEdit && (
          <Modal
            title={`Edit ${featureLabel}`}
            onClose={() => setShowEdit(false)}
            wide
          >
            <form onSubmit={handleUpdate}>
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {fields.map((field) => (
                  <FormField
                    key={field.name}
                    label={field.label || field.name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    name={field.name}
                    type={field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={handleFieldChange}
                    options={field.options || []}
                    placeholder={field.placeholder || ''}
                    required={field.required || false}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? <span className="spinner" /> : <Pencil size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete confirmation */}
        {showDelete && (
          <Modal title="Delete Item" onClose={() => setShowDelete(false)}>
            <p className="text-slate-300">
              Are you sure you want to delete{' '}
              <strong className="text-slate-100">
                {item.name || item.title || 'this item'}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}
