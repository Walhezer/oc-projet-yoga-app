import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { authService } from '../services/auth.service';
import { Teacher, Session, SessionFormData } from '../types';

function SessionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    date: '',
    description: '',
    teacherId: 0,
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const user = authService.getCurrentUser();
  const token = authService.getToken();

  useEffect(() => {
    if (!user || !user.admin) {
      navigate('/sessions');
    }
  }, [user, navigate]);

  useEffect(() => {
    const controller = new AbortController();

    fetchTeachers(controller.signal);
    if (isEditMode) {
      fetchSession(controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [id]);

  const fetchTeachers = async (signal?: AbortSignal): Promise<void> => {
    try {
      const response = await api.get<Teacher[]>('/teacher', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: signal,
      });
      setTeachers(response.data);
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch teachers', err);
    }
  };

  const fetchSession = async (signal?: AbortSignal): Promise<void> => {
    try {
      const response = await api.get<Session>(`/session/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: signal,
      });
      const session = response.data;
      setFormData({
        name: session.name,
        date: new Date(session.date).toISOString().split('T')[0],
        description: session.description,
        teacherId: session.teacher.id,
      });
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      setError('Failed to load session');
      console.error(err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const value =
      e.target.name === 'teacherId' ? parseInt(e.target.value, 10) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/session/${id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await api.post('/session', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      navigate('/sessions');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to save session');
      } else {
        setError('Failed to save session');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            {isEditMode ? 'Edit Session' : 'Create New Session'}
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="session-name" className="block text-gray-700 text-sm font-bold mb-2">
                Session Name
              </label>
              <input
                id="session-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="session-date" className="block text-gray-700 text-sm font-bold mb-2">
                Date
              </label>
              <input
                id="session-date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="session-teacher" className="block text-gray-700 text-sm font-bold mb-2">
                Teacher
              </label>
              <select
                id="session-teacher"
                name="teacherId"
                value={formData.teacherId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select a teacher</option>
                {teachers.map((teacher: Teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="session-description" className="block text-gray-700 text-sm font-bold mb-2">
                Description
              </label>
              <textarea
                id="session-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : isEditMode ? 'Update Session' : 'Create Session'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/sessions')}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SessionForm;