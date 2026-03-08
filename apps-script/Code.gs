/**
 * Google Apps Script endpoint for chunked gaze-data ingestion.
 *
 * Expects POST fields:
 * - participant_id
 * - chunk_index
 * - chunks_total
 * - gaze_chunk (JSON array string)
 * - send_reason: checkout_chunk | checkout_complete
 */
function doPost(e) {
  var params = e && e.parameter ? e.parameter : {};
  var participantId = params.participant_id || 'unknown';
  var chunkIndex = Number(params.chunk_index || -1);
  var chunksTotal = Number(params.chunks_total || 0);
  var sendReason = params.send_reason || 'unknown';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var chunksSheet = getOrCreateSheet_(ss, 'GazeChunks');
  var sessionsSheet = getOrCreateSheet_(ss, 'GazeSessions');

  ensureChunksHeader_(chunksSheet);
  ensureSessionsHeader_(sessionsSheet);

  if (sendReason === 'checkout_chunk') {
    var chunkPayload = params.gaze_chunk || '[]';
    var chunkSize = chunkPayload.length;

    // сохраняем каждый чанк в отдельной строке
    chunksSheet.appendRow([
      new Date(),
      participantId,
      chunkIndex,
      chunksTotal,
      chunkSize,
      chunkPayload,
      params.points_count || '',
      params.duration_sec || '',
      params.banner_hits || ''
    ]);
  }

  if (sendReason === 'checkout_complete') {
    sessionsSheet.appendRow([
      new Date(),
      participantId,
      chunksTotal,
      params.points_count || '',
      params.duration_sec || '',
      params.screen_w || '',
      params.screen_h || '',
      params.device_pixel_ratio || '',
      params.user_agent || '',
      params.scroll_events || '',
      params.banner_rect_viewport || '',
      params.banner_rect_page || '',
      params.banner_hits || '',
      sendReason
    ]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ensureChunksHeader_(sheet) {
  if (sheet.getLastRow() !== 0) return;
  sheet.appendRow([
    'received_at',
    'participant_id',
    'chunk_index',
    'chunks_total',
    'gaze_chunk_size',
    'gaze_chunk',
    'points_count',
    'duration_sec',
    'banner_hits'
  ]);
}

function ensureSessionsHeader_(sheet) {
  if (sheet.getLastRow() !== 0) return;
  sheet.appendRow([
    'received_at',
    'participant_id',
    'chunks_total',
    'points_count',
    'duration_sec',
    'screen_w',
    'screen_h',
    'device_pixel_ratio',
    'user_agent',
    'scroll_events',
    'banner_rect_viewport',
    'banner_rect_page',
    'banner_hits',
    'send_reason'
  ]);
}
