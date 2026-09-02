import { Notification } from '../models/Notification.js';
import { serializeUser } from '../utils/serialize.js';

export async function notify({ recipient, actor, type, post, comment, message }) {
  if (!recipient || (actor && String(recipient) === String(actor))) return;
  await Notification.create({ recipient, actor, type, post, comment, message });
}

export async function listNotifications(user, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total, unread] = await Promise.all([
    Notification.find({ recipient: user._id })
      .populate('actor', 'profile.fullName profile.avatar')
      .populate('post', 'caption images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ recipient: user._id }),
    Notification.countDocuments({ recipient: user._id, read: false }),
  ]);
  return {
    items: items.map((n) => ({
      id: String(n._id),
      type: n.type,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      actor: serializeUser(n.actor, user),
      post: n.post
        ? {
            id: String(n.post._id),
            caption: n.post.caption || '',
            image: n.post.images?.[0] || null,
          }
        : null,
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    unread,
  };
}

export async function markRead(user, id) {
  await Notification.updateOne({ _id: id, recipient: user._id }, { read: true });
}

export async function markAllRead(user) {
  await Notification.updateMany({ recipient: user._id, read: false }, { read: true });
}
