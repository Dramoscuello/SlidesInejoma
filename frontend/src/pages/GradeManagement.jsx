import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, Calendar, FileText, Play, Trash2, LogOut, Upload, X, BookOpen, CheckCircle, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { clearSession } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function GradeManagement() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Uploading / Processing presentations state
  const [uploadingPresentations, setUploadingPresentations] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Modals
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Custom Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: null,
  });

  // Form states
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newGradeName, setNewGradeName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newPresentationTitle, setNewPresentationTitle] = useState('');
  const [file, setFile] = useState(null);

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error al obtener asignaturas:', err);
    }
  };

  // Fetch grades & presentations
  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/grades`);
      if (res.ok) {
        const data = await res.json();
        const gradesWithPresentations = await Promise.all(
          data.map(async (grade) => {
            try {
              const presRes = await fetch(`${API_URL}/api/presentations/grade/${grade.id}`);
              const presData = presRes.ok ? await presRes.json() : [];
              return { ...grade, presentations: presData };
            } catch {
              return { ...grade, presentations: [] };
            }
          })
        );
        setGrades(gradesWithPresentations);
      }
    } catch (err) {
      console.error('Error al obtener grados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchSubjects();
  }, []);

  const handleCreateGrade = async (e) => {
    e.preventDefault();
    if (!newGradeName) return;

    try {
      const res = await fetch(`${API_URL}/api/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGradeName, year: currentYear }),
      });

      if (res.ok) {
        setNewGradeName('');
        setIsGradeModalOpen(false);
        fetchGrades();
      }
    } catch (err) {
      console.error('Error al crear grado:', err);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName) return;

    try {
      const res = await fetch(`${API_URL}/api/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName }),
      });

      if (res.ok) {
        setNewSubjectName('');
        setIsSubjectModalOpen(false);
        fetchSubjects();
      }
    } catch (err) {
      console.error('Error al crear asignatura:', err);
    }
  };

  const handleUploadPresentation = async (e) => {
    e.preventDefault();
    if (!newPresentationTitle || !selectedGradeId || isUploading) return;

    const title = newPresentationTitle;
    const gradeId = selectedGradeId;
    const tempId = 'proc-' + Date.now();

    // 1. Immediately close modal & reset form to prevent multi-clicking
    setIsUploadModalOpen(false);
    setNewPresentationTitle('');
    setSelectedSubjectId('');
    setFile(null);
    setIsUploading(true);

    // 2. Add temporary placeholder card for loading state
    setUploadingPresentations(prev => [...prev, {
      id: tempId,
      grade_id: gradeId,
      title: title,
    }]);

    const formData = new FormData();
    formData.append('grade_id', gradeId);
    if (selectedSubjectId) formData.append('subject_id', selectedSubjectId);
    formData.append('title', title);
    if (file) formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/presentations`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchGrades();
      }
    } catch (err) {
      console.error('Error al crear presentación:', err);
    } finally {
      setUploadingPresentations(prev => prev.filter(p => p.id !== tempId));
      setIsUploading(false);
    }
  };

  const handleDeletePresentation = (presId, presTitle) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar presentación?',
      message: `¿Estás seguro de que deseas eliminar la presentación "${presTitle || ''}"?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`${API_URL}/api/presentations/${presId}`, { method: 'DELETE' });
          fetchGrades();
        } catch (err) {
          console.error('Error al eliminar presentación:', err);
        }
      }
    });
  };

  const handleDeleteGrade = (gradeId, gradeName) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar grado?',
      message: `¿Estás seguro de que deseas eliminar el grado "${gradeName || ''}" y todas sus presentaciones asociadas?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`${API_URL}/api/grades/${gradeId}`, { method: 'DELETE' });
          fetchGrades();
        } catch (err) {
          console.error('Error al eliminar grado:', err);
        }
      }
    });
  };

  const handleDeleteSubject = (subjectId, subjectName) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar asignatura?',
      message: `¿Estás seguro de que deseas eliminar la asignatura "${subjectName || ''}"?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`${API_URL}/api/subjects/${subjectId}`, { method: 'DELETE' });
          fetchSubjects();
          fetchGrades();
        } catch (err) {
          console.error('Error al eliminar asignatura:', err);
        }
      }
    });
  };

  const openUploadModal = (gradeId) => {
    setSelectedGradeId(gradeId);
    setIsUploadModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-brand-light)' }}>
      {/* Top Navbar */}
      <nav style={{
        backgroundColor: 'var(--color-brand-dark)',
        color: '#ffffff',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            backgroundColor: 'var(--color-brand-primary)',
            padding: '0.5rem',
            borderRadius: '10px'
          }}>
            <Sparkles size={20} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>SlidesInejoma</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Calendar size={16} />
            <span>Año Lectivo: {currentYear}</span>
          </div>

          <button
            onClick={() => setIsSubjectModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <BookOpen size={16} />
            <span>Gestión de asignaturas</span>
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
            title="Cerrar sesión de docente"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header Title & Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-brand-dark)', marginBottom: '0.25rem' }}>
              Gestión de grados y clases
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Administra los grados lectivos del instituto y sube presentaciones en tiempo real.
            </p>
          </div>

          <button
            onClick={() => setIsGradeModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={18} />
            <span>Crear nuevo grado</span>
          </button>
        </div>

        {/* Grades Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Cargando información de los grados...</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="academic-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Calendar size={48} color="var(--color-brand-primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-brand-dark)', marginBottom: '0.5rem' }}>
              No hay grados creados para el año {currentYear}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Comienza creando un grado (ej. 10-A, 11-B) para organizar tus presentaciones.
            </p>
            <button onClick={() => setIsGradeModalOpen(true)} className="btn-primary">
              <Plus size={18} />
              <span>Crear mi primer grado</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {grades.map((grade) => (
              <div key={grade.id} className="academic-card" style={{ padding: '1.75rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--color-brand-accent)',
                  paddingBottom: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--color-brand-dark)' }}>
                      Grado {grade.name}
                    </h2>
                    <span style={{
                      backgroundColor: 'var(--color-brand-accent)',
                      color: 'var(--color-brand-dark)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px'
                    }}>
                      Lectivo {grade.year}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => openUploadModal(grade.id)}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    >
                      <Upload size={16} />
                      <span>Subir presentación</span>
                    </button>
                    <button
                      onClick={() => handleDeleteGrade(grade.id, grade.name)}
                      style={{ background: 'none', color: '#9ca3af', padding: '0.4rem' }}
                      title="Eliminar grado"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Presentations List for this Grade */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Presentaciones registradas ({grade.presentations.length + uploadingPresentations.filter(p => p.grade_id === grade.id).length})
                  </h3>

                  {grade.presentations.length === 0 && uploadingPresentations.filter(p => p.grade_id === grade.id).length === 0 ? (
                    <div style={{
                      backgroundColor: 'var(--color-brand-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.85rem'
                    }}>
                      No hay presentaciones subidas en este grado. Haz clic en "Subir presentación" para agregar una.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Render in-progress upload cards with spinning loader */}
                      {uploadingPresentations
                        .filter(p => p.grade_id === grade.id)
                        .map(p => (
                          <div
                            key={p.id}
                            style={{
                              backgroundColor: 'rgba(107, 138, 97, 0.08)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px dashed var(--color-brand-primary)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Loader2 size={20} className="animate-spin" color="var(--color-brand-primary)" />
                              <div>
                                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-brand-dark)' }}>
                                  {p.title}
                                </span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-brand-primary)', marginTop: '0.15rem', fontWeight: '500' }}>
                                  Procesando PDF y generando diapositivas... Por favor espera un momento.
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Render ready presentations */}
                      {grade.presentations.map(pres => (
                        <div
                          key={pres.id}
                          style={{
                            backgroundColor: 'var(--color-brand-light)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={16} color="var(--color-brand-primary)" />
                              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-brand-dark)' }}>
                                {pres.title}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                              {pres.subject_name && (
                                <span style={{
                                  backgroundColor: 'rgba(107, 138, 97, 0.15)',
                                  color: 'var(--color-brand-dark)',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px'
                                }}>
                                  📘 {pres.subject_name}
                                </span>
                              )}
                              <span className="badge-code" style={{ backgroundColor: 'var(--color-brand-dark)', fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                CÓDIGO: {pres.code}
                              </span>
                              {pres.is_live && (
                                <span className="badge-live" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                                  🔴 EN CLASE
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => navigate(`/presenter/${pres.id}?code=${pres.code}&slides=${pres.slide_count}`)}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                              title="Presentar en vivo"
                            >
                              <Play size={14} />
                              <span>Presentar</span>
                            </button>
                            <button
                              onClick={() => handleDeletePresentation(pres.id, pres.title)}
                              style={{ background: 'none', color: '#9ca3af', padding: '0.4rem' }}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Grade Modal */}
      {isGradeModalOpen && (
        <div className="modal-overlay">
          <div className="academic-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-brand-dark)' }}>
                Crear nuevo grado ({currentYear})
              </h3>
              <button onClick={() => setIsGradeModalOpen(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGrade}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                  Nombre del grado
                </label>
                <input
                  type="text"
                  required
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                  placeholder="Ej. 10-A, 11-B, 9-02"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-brand-accent)',
                    backgroundColor: 'var(--color-brand-light)'
                  }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
                Guardar grado
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subjects Management Modal */}
      {isSubjectModalOpen && (
        <div className="modal-overlay">
          <div className="academic-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-brand-dark)' }}>
                Gestión de asignaturas
              </h3>
              <button onClick={() => setIsSubjectModalOpen(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            {/* Add Subject Form */}
            <form onSubmit={handleCreateSubject} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                required
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Nombre de la asignatura (ej. Biología)"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-brand-accent)',
                  backgroundColor: 'var(--color-brand-light)'
                }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
                Agregar
              </button>
            </form>

            {/* Subjects List */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-brand-primary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Asignaturas registradas ({subjects.length})
            </h4>

            {subjects.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No hay asignaturas registradas.
              </p>
            ) : (
              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {subjects.map(subject => (
                  <div
                    key={subject.id}
                    style={{
                      padding: '0.65rem 1rem',
                      backgroundColor: 'var(--color-brand-light)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{subject.name}</span>
                    <button
                      onClick={() => handleDeleteSubject(subject.id, subject.name)}
                      style={{ background: 'none', color: '#9ca3af' }}
                      title="Eliminar asignatura"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Presentation Modal */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div className="academic-card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-brand-dark)' }}>
                Subir presentación
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadPresentation}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                  Asignatura (opcional)
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-brand-accent)',
                    backgroundColor: 'var(--color-brand-light)',
                    color: 'var(--color-brand-dark)',
                    fontWeight: '500'
                  }}
                >
                  <option value="">-- Sin asignatura asignada --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                  Título de la presentación
                </label>
                <input
                  type="text"
                  required
                  value={newPresentationTitle}
                  onChange={(e) => setNewPresentationTitle(e.target.value)}
                  placeholder="Ej. Fotosíntesis y respiración celular"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-brand-accent)',
                    backgroundColor: 'var(--color-brand-light)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                  Archivo PDF (.pdf)
                </label>
                <div style={{
                  border: '2px dashed var(--color-brand-accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-brand-light)',
                  position: 'relative'
                }}>
                  {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-brand-primary)' }}>
                      <CheckCircle size={24} />
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} color="var(--color-brand-primary)" style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        Haz clic o arrastra un archivo PDF aquí
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isUploading}
                style={{ width: '100%', padding: '0.8rem', opacity: isUploading ? 0.6 : 1 }}
              >
                {isUploading ? 'Iniciando procesamiento...' : 'Guardar presentación'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
