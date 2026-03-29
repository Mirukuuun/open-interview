import { qaMilvusFoundationService } from "@/server/vector/qa-milvus-foundation";

/**
 * [POS] 作为 QA Milvus foundation 的轻量 job entrypoint，供 retrieval / health / 后续 worker 复用。
 * [IN] 可选的 batch size / runSync 开关。
 * [OUT] 返回单次小批量 backfill / delete / upsert 的执行摘要。
 *
 * @feature open-interview-qa-feature.md
 * @AI_INSTRUCTION 一旦本文件被更新，务必同步更新本注释，以及对应的 L2 feature 文档。
 */

export async function runQaMilvusSyncJob(options?: {
  maxChunks?: number;
}) {
  return qaMilvusFoundationService.prepare({
    runSync: true,
    maxChunks: options?.maxChunks,
  });
}

if (require.main === module) {
  runQaMilvusSyncJob({
    maxChunks: Number(process.env.MILVUS_SYNC_BATCH_SIZE ?? 1),
  }).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error("Error running Milvus sync job:", error);
    process.exit(1);
  });
}