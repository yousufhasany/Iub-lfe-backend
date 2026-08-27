export function maskStudentId(studentId) {
  if (!studentId) return null;
  const visible = studentId.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(studentId.length - 2, 3))}`;
}

export function canViewFullStudentId(viewer, targetUserId) {
  if (!viewer) return false;
  if (viewer.role === 'admin' || viewer.role === 'teacher') return true;
  return String(viewer._id) === String(targetUserId);
}
