# Lead delivery contract v2

The queue uses one atomic SQLite UPDATE ... RETURNING statement to claim a lead. The returned attempts value is the claim generation. ACK and failure requests must contain the returned id, submissionId, and attempt. ACK also requires outcome: completed or rejected. Old or mismatched claims receive HTTP 409 and cannot settle a newer attempt.

Failures wait six minutes before retry, longer than the intake's five-minute lock. A ten-minute expired claim can be recovered. Five attempts is the limit, including expired executions. Rejected submissions remain recorded separately from processed leads. Receipt tokens are omitted from queue delivery payloads; conversion receipt behavior is otherwise preserved. Explicit isTest is retained for downstream protection.

Deploy the compatible queue dispatcher before this worker. The dispatcher must accept intake only on HTTP 200 with contractVersion=2, ok=true, settled=true, matching submissionId and valid intake/prospect IDs. It must report non-204 claim errors, never equate redirects with completion, and supply the fenced settlement fields above.

Offline validation: node test/receipts.cjs; node test/thank-you.cjs; python test/queue-sql.py. The SQLite test runs eight concurrent local claims, validates backoff and stale settlement rejection, and makes no network calls.

Rollback requires coordinating the worker and dispatcher contracts. Do not replay uncertain calls or reset failed rows in bulk.
