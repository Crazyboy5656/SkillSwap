import { supabase } from './supabase-client.js?v=2';

// ─── Raw REST helpers ─────────────────────────────────────────────────────────
// supabase-js .from() queries hang in this environment; use raw fetch instead.

async function _token() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? window.SUPABASE_ANON_KEY;
}

const BASE = () => `${window.SUPABASE_URL}/rest/v1`;

async function _get(path) {
  const tok = await _token();
  const r = await fetch(`${BASE()}/${path}`, {
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tok}`,
      Accept: 'application/json',
    },
  });
  if (!r.ok) return { data: null, error: await r.json().catch(() => ({ message: r.statusText })) };
  return { data: await r.json(), error: null };
}

async function _single(path) {
  const { data, error } = await _get(path);
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? (data[0] ?? null) : data;
  if (!row) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
  return { data: row, error: null };
}

async function _post(path, body) {
  const tok = await _token();
  const r = await fetch(`${BASE()}/${path}`, {
    method: 'POST',
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return { data: null, error: await r.json().catch(() => ({ message: r.statusText })) };
  const d = await r.json();
  return { data: Array.isArray(d) ? d[0] : d, error: null };
}

async function _patch(path, body) {
  const tok = await _token();
  const r = await fetch(`${BASE()}/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return { data: null, error: await r.json().catch(() => ({ message: r.statusText })) };
  const d = await r.json();
  return { data: Array.isArray(d) ? d[0] : d, error: null };
}

async function _delete(path) {
  const tok = await _token();
  const r = await fetch(`${BASE()}/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tok}`,
    },
  });
  return { error: r.ok ? null : await r.json().catch(() => ({ message: r.statusText })) };
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  return _single(`profiles?id=eq.${encodeURIComponent(userId)}&select=*`);
}

export async function getProfileByHandle(handle) {
  return _single(`profiles?handle=eq.${encodeURIComponent(handle)}&select=*`);
}

export async function updateProfile(userId, updates) {
  return _patch(`profiles?id=eq.${encodeURIComponent(userId)}`, updates);
}

export async function uploadAvatar(userId, file) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { url: null, error: { message: 'Giriş yapman gerekiyor.' } };
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) return { url: null, error };
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${pub.publicUrl}${pub.publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  return { url, error: null };
}

// ─── Categories & Skills ─────────────────────────────────────────────────────

export async function getCategories() {
  return _get('categories?select=*&order=name');
}

export async function getSkills(categoryId = null) {
  const filter = categoryId ? `&category_id=eq.${encodeURIComponent(categoryId)}` : '';
  return _get(`skills?select=id,name,slug,category:categories(id,name,icon)&order=name${filter}`);
}

export async function searchSkills(query) {
  return _get(`skills?select=id,name,slug,category:categories(id,name,icon)&name=ilike.*${encodeURIComponent(query)}*&limit=20`);
}

// ─── User Skills (listings) ──────────────────────────────────────────────────

export async function getUserSkills(userId) {
  return _get(`user_skills?select=*,skill:skills(id,name,slug,category:categories(name,icon))&user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&order=created_at.desc.nullslast`);
}

export async function getListings({ kind, skillIds, mode, search, limit = 20, offset = 0 } = {}) {
  let q = `user_skills?select=*,skill:skills(id,name,slug,category:categories(name,icon,slug)),profile:profiles(id,handle,display_name,avatar_url,tutor_rating,learner_rating)&is_active=eq.true&order=created_at.desc.nullslast&limit=${limit}&offset=${offset}`;
  if (kind) q += `&kind=eq.${kind}`;
  if (mode) q += `&mode=eq.${mode}`;
  if (search) q += `&title=ilike.*${encodeURIComponent(search)}*`;
  if (skillIds?.length) q += `&skill_id=in.(${skillIds.join(',')})`;
  return _get(q);
}

export async function getListing(id) {
  return _single(`user_skills?id=eq.${encodeURIComponent(id)}&select=*,skill:skills(id,name,slug,category:categories(name,icon)),profile:profiles(id,handle,display_name,avatar_url,tutor_rating,learner_rating,bio)`);
}

export async function createListing(payload) {
  return _post('user_skills', payload);
}

export async function updateListing(id, updates) {
  return _patch(`user_skills?id=eq.${encodeURIComponent(id)}`, updates);
}

export async function deactivateListing(id) {
  return updateListing(id, { is_active: false });
}

// ─── Matching ────────────────────────────────────────────────────────────────

export async function findMatches(userId, limit = 20) {
  const tok = await _token();
  const r = await fetch(`${BASE()}/rpc/find_matches`, {
    method: 'POST',
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_user: userId, p_limit: limit }),
  });
  if (!r.ok) return { data: null, error: await r.json().catch(() => ({ message: r.statusText })) };
  return { data: await r.json(), error: null };
}

// ─── Match Requests ──────────────────────────────────────────────────────────

export async function sendMatchRequest(toUser, listingId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: { message: 'Not authenticated' } };
  return _post('match_requests', {
    from_user: session.user.id,
    to_user:   toUser,
    to_skill:  listingId,
  });
}

export async function respondMatchRequest(requestId, status) {
  return _patch(`match_requests?id=eq.${encodeURIComponent(requestId)}`, { status });
}

export async function getIncomingRequests() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: [], error: null };
  // to_skill is the listing the applicant is interested in
  return _get(`match_requests?select=*,from_profile:profiles!from_user(id,handle,display_name,avatar_url),listing:user_skills!to_skill(id,title,skill:skills(name))&to_user=eq.${session.user.id}&status=eq.pending&order=created_at.desc.nullslast`);
}

// ─── Matches ─────────────────────────────────────────────────────────────────

export async function getMatches() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: [], error: null };
  const uid = session.user.id;
  return _get(`matches?select=*,profile_a:profiles!user_a(id,handle,display_name,avatar_url),profile_b:profiles!user_b(id,handle,display_name,avatar_url),skill_a_data:user_skills!skill_a(skill_id,user_id,title,skill:skills(name)),skill_b_data:user_skills!skill_b(skill_id,user_id,title,skill:skills(name))&or=(user_a.eq.${uid},user_b.eq.${uid})&order=created_at.desc.nullslast`);
}

const SKILL_EMBED = 'skill_id,user_id,title,skill:skills(name)';

export async function getMatch(matchId) {
  return _single(
    `matches?id=eq.${encodeURIComponent(matchId)}&select=*,` +
    `profile_a:profiles!user_a(id,handle,display_name,avatar_url),` +
    `profile_b:profiles!user_b(id,handle,display_name,avatar_url),` +
    `skill_a_data:user_skills!skill_a(${SKILL_EMBED}),` +
    `skill_b_data:user_skills!skill_b(${SKILL_EMBED})`
  );
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(matchId, limit = 50) {
  return _get(`messages?select=*,sender:profiles!sender_id(id,handle,display_name,avatar_url)&match_id=eq.${encodeURIComponent(matchId)}&order=created_at.asc.nullslast&limit=${limit}`);
}

export async function sendMessage(matchId, body, attachmentUrl = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: { message: 'Not authenticated' } };
  return _post('messages', {
    match_id:       matchId,
    sender_id:      session.user.id,
    body,
    attachment_url: attachmentUrl,
  });
}

export async function markMessagesRead(matchId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await _patch(`messages?match_id=eq.${encodeURIComponent(matchId)}&sender_id=neq.${session.user.id}&read_at=is.null`,
    { read_at: new Date().toISOString() });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(payload) {
  return _post('sessions', payload);
}

export async function getSessionsForMatch(matchId) {
  return _get(`sessions?select=*,tutor:profiles!tutor_id(id,handle,display_name,avatar_url),learner:profiles!learner_id(id,handle,display_name,avatar_url),skill:skills(name)&match_id=eq.${encodeURIComponent(matchId)}&order=starts_at.asc.nullslast`);
}

export async function updateSessionStatus(sessionId, status) {
  return _patch(`sessions?id=eq.${encodeURIComponent(sessionId)}`, { status });
}

export async function getMySessions() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: [], error: null };
  const uid = session.user.id;
  return _get(`sessions?select=*,tutor:profiles!tutor_id(id,handle,display_name,avatar_url),learner:profiles!learner_id(id,handle,display_name,avatar_url),skill:skills(name)&or=(tutor_id.eq.${uid},learner_id.eq.${uid})&order=starts_at.desc.nullslast`);
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function createReview(sessionId, revieweeId, role, rating, comment) {
  return _post('reviews', { session_id: sessionId, reviewee_id: revieweeId, role, rating, comment });
}

export async function deleteReview(reviewId) {
  return _delete(`reviews?id=eq.${encodeURIComponent(reviewId)}`);
}

export async function getReviewEligibility(revieweeId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      canAsTutor: false,
      canAsStudent: false,
      sessionIdAsTutor: null,
      sessionIdAsStudent: null,
    };
  }
  const me = session.user.id;
  // as_tutor: reviewee was my instructor (I was learner)
  const t1 = await _get(
    `sessions?select=id&status=eq.completed&tutor_id=eq.${encodeURIComponent(revieweeId)}` +
    `&learner_id=eq.${encodeURIComponent(me)}&order=starts_at.desc&limit=1`
  );
  // as_student: I taught them
  const t2 = await _get(
    `sessions?select=id&status=eq.completed&learner_id=eq.${encodeURIComponent(revieweeId)}` +
    `&tutor_id=eq.${encodeURIComponent(me)}&order=starts_at.desc&limit=1`
  );
  return {
    canAsTutor: (t1.data?.length || 0) > 0,
    canAsStudent: (t2.data?.length || 0) > 0,
    sessionIdAsTutor: t1.data?.[0]?.id ?? null,
    sessionIdAsStudent: t2.data?.[0]?.id ?? null,
  };
}

export async function createDirectReview(revieweeId, rating, comment, role = 'as_tutor') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null, error: { message: 'Giriş yapman gerekiyor.' } };
  const elig = await getReviewEligibility(revieweeId);
  const sessionId =
    role === 'as_tutor' ? elig.sessionIdAsTutor : elig.sessionIdAsStudent;
  if (role === 'as_tutor' && !elig.canAsTutor) {
    return { data: null, error: { message: 'Bu kişiyle tamamlanmış dersin yok; eğitmen olarak değerlendiremezsin.' } };
  }
  if (role === 'as_student' && !elig.canAsStudent) {
    return { data: null, error: { message: 'Bu kişiye ders vermediğin için öğrenci olarak değerlendiremezsin.' } };
  }
  if (!sessionId) {
    return { data: null, error: { message: 'Uygun seans bulunamadı.' } };
  }
  return _post('reviews', {
    session_id: sessionId,
    reviewer_id: session.user.id,
    reviewee_id: revieweeId,
    role,
    rating,
    comment,
  });
}

export async function getTutorIdForMatch(userA, userB) {
  // to_user in the original match_request is the listing owner (tutor)
  const { data } = await _get(
    `match_requests?select=to_user&status=eq.accepted` +
    `&or=(and(from_user.eq.${encodeURIComponent(userA)},to_user.eq.${encodeURIComponent(userB)}),` +
    `and(from_user.eq.${encodeURIComponent(userB)},to_user.eq.${encodeURIComponent(userA)}))&limit=1`
  );
  return data?.[0]?.to_user ?? null;
}

/** Listing skill (skills.id) for the tutor's ilan, when embeds on matches are missing. */
export async function getListingSkillIdForTutor(tutorId, userA, userB) {
  const other = userA === tutorId ? userB : userA;
  const { data, error } = await _get(
    `match_requests?select=listing:user_skills!to_skill(skill_id)&status=eq.accepted` +
    `&to_user=eq.${encodeURIComponent(tutorId)}&from_user=eq.${encodeURIComponent(other)}&limit=1`
  );
  if (error || !data?.[0]) return null;
  return data[0].listing?.skill_id ?? null;
}

export async function getReviewsForUser(userId) {
  return _get(`reviews?select=*,reviewer:profiles!reviewer_id(id,handle,display_name,avatar_url)&reviewee_id=eq.${encodeURIComponent(userId)}&order=created_at.desc.nullslast`);
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(limit = 30) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: [], error: null };
  return _get(`notifications?select=*&user_id=eq.${session.user.id}&order=created_at.desc.nullslast&limit=${limit}`);
}

export async function markNotificationRead(id) {
  await _patch(`notifications?id=eq.${encodeURIComponent(id)}`, { read: true });
}

export async function markAllNotificationsRead() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await _patch(`notifications?user_id=eq.${session.user.id}&read=eq.false`, { read: true });
}

export async function getUnreadCount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 0;
  const tok = session.access_token;
  const r = await fetch(`${BASE()}/notifications?user_id=eq.${session.user.id}&read=eq.false&select=id`, {
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tok}`,
      Accept: 'application/json',
      Prefer: 'count=exact',
    },
  });
  const countHeader = r.headers.get('content-range');
  if (countHeader) {
    const total = parseInt(countHeader.split('/')[1]);
    return isNaN(total) ? 0 : total;
  }
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data.length : 0;
}

// ─── AI (Gemini proxy via Edge Function) ─────────────────────────────────────

export async function askAI(type, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { result: null, error: { error: 'Giriş yapman gerekiyor.' } };
  try {
    const r = await fetch(`${window.SUPABASE_URL}/functions/v1/gemini-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': window.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ type, ...params }),
    });
    const data = await r.json();
    if (!r.ok || data.error) return { result: null, error: data };
    return { result: data.result, error: null };
  } catch (err) {
    return { result: null, error: { error: err.message } };
  }
}

// ─── Block / Report ──────────────────────────────────────────────────────────

export async function blockUser(targetUserId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: { message: 'Not authenticated' } };
  return _post('blocks', { blocker_id: session.user.id, blocked_id: targetUserId });
}

export async function reportUser(targetUserId, reason) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: { message: 'Not authenticated' } };
  return _post('reports', { reporter_id: session.user.id, reported_id: targetUserId, reason });
}
