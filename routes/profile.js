const express = require('express');
const db = require('../src/db');
const { requireAuth } = require('../src/middleware');

const router = express.Router();

// Self-service representative profile
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.redirect('/logout');
    }
    const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
    const flashMsg = req.session.flash || null;
    req.session.flash = null;
    res.render('profile', {
      title: 'My Profile',
      flash: flashMsg,
      user,
      hasBankDetails,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.redirect('/logout');
    }

    const { name, email, phone, abn, bank_name, bank_bsb, bank_account, current_pin, new_pin, confirm_pin } = req.body || {};

    // Validate personal details
    if (!name || !String(name).trim()) {
      const flashMsg = { type: 'error', text: 'Name is required.' };
      const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
      req.session.flash = flashMsg;
      return res.render('profile', {
        title: 'My Profile',
        flash: flashMsg,
        user,
        hasBankDetails,
      });
    }

    if (email && String(email).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      const flashMsg = { type: 'error', text: 'Invalid email format.' };
      const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
      return res.render('profile', {
        title: 'My Profile',
        flash: flashMsg,
        user,
        hasBankDetails,
      });
    }

    // PIN change validation
    const newPinRaw = new_pin ? String(new_pin).trim() : '';
    const confirmPinRaw = confirm_pin ? String(confirm_pin).trim() : '';
    const currentPinRaw = current_pin ? String(current_pin).trim() : '';

    if (newPinRaw) {
      // Require current PIN when changing PIN
      if (!currentPinRaw) {
        const flashMsg = { type: 'error', text: 'Current PIN is required to change your PIN.' };
        const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
        return res.render('profile', {
          title: 'My Profile',
          flash: flashMsg,
          user,
          hasBankDetails,
        });
      }

      // Verify current PIN
      const bcrypt = require('bcryptjs');
      const fullUser = await db.getUserForAuth(user.id);
      if (!bcrypt.compareSync(currentPinRaw, fullUser.pin_hash)) {
        const flashMsg = { type: 'error', text: 'Current PIN is incorrect.' };
        const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
        return res.render('profile', {
          title: 'My Profile',
          flash: flashMsg,
          user,
          hasBankDetails,
        });
      }

      // Validate new PIN
      if (!/^\d{4}$/.test(newPinRaw)) {
        const flashMsg = { type: 'error', text: 'New PIN must be exactly 4 digits.' };
        const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
        return res.render('profile', {
          title: 'My Profile',
          flash: flashMsg,
          user,
          hasBankDetails,
        });
      }

      if (newPinRaw !== confirmPinRaw) {
        const flashMsg = { type: 'error', text: 'New PIN and confirmation do not match.' };
        const hasBankDetails = !!(user.bank_name || user.bank_bsb || user.bank_account);
        return res.render('profile', {
          title: 'My Profile',
          flash: flashMsg,
          user,
          hasBankDetails,
        });
      }
    }

    // Build updates
    const updates = {
      name: String(name).trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      abn: String(abn || '').trim(),
      bank_name: String(bank_name || '').trim(),
      bank_bsb: String(bank_bsb || '').trim(),
      bank_account: String(bank_account || '').trim(),
    };

    // Apply profile updates
    await db.updateOwnProfile(user.id, updates);

    // Apply PIN change if requested
    if (newPinRaw) {
      await db.resetPin(user.id, newPinRaw);
      await db.logUserAudit({
        targetUserId: user.id,
        actorUserId: user.id,
        action: 'PIN_CHANGED',
        fieldName: 'pin',
        oldValue: null,
        newValue: null,
      });
    }

    // Audit profile field changes
    const auditFields = ['name', 'email', 'phone', 'abn', 'bank_name', 'bank_bsb', 'bank_account'];
    for (const field of auditFields) {
      const oldVal = user[field] || '';
      const newVal = updates[field] || '';
      if (oldVal !== newVal) {
        await db.logUserAudit({
          targetUserId: user.id,
          actorUserId: user.id,
          action: 'FIELD_CHANGED',
          fieldName: field,
          oldValue: field === 'bank_account' ? maskAccount(oldVal) : oldVal,
          newValue: field === 'bank_account' ? maskAccount(newVal) : newVal,
        });
      }
    }

    // Update session representation
    if (req.session.displayName) {
      req.session.displayName = updates.name;
    }

    req.session.flash = { type: 'success', text: 'Profile updated successfully.' };
    res.redirect('/profile');
  } catch (err) {
    next(err);
  }
});

function maskAccount(val) {
  if (!val) return '';
  const s = String(val).replace(/\s/g, '');
  if (s.length <= 4) return '****';
  return '****' + s.slice(-4);
}

router.post('/profile/reset-pin', requireAuth, async (req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).send('Not found');
  }
  try {
    await db.resetPin(req.user.id, '1234');
    await db.logUserAudit({
      targetUserId: req.user.id,
      actorUserId: req.user.id,
      action: 'PIN_RESET_TEST',
      fieldName: 'pin',
      oldValue: null,
      newValue: null,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
