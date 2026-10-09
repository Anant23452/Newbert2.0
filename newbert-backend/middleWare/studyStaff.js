const User = require('../Models/User');
async function isStaff(id) {
  if (!id) return false;
  const user = await User.findById(id).select('email').lean();
  const allowed = `${process.env.ADMIN_EMAILS || ''},${process.env.MENTOR_EMAILS || ''}`.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  return Boolean(user && allowed.includes(String(user.email).toLowerCase()));
}
async function requireStaff(req,res,next) { try { if (!await isStaff(req.auth?.id)) return res.status(403).json({message:'Mentor access is required.'}); next(); } catch(e) {next(e);} }
module.exports = { isStaff, requireStaff };
