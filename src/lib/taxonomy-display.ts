const categoryDisplayNameMap: Record<string, string> = {
  distributed_system: "分布式系统",
  database: "数据库",
  java_concurrency: "Java 并发",
  java_jvm: "Java JVM",
  backend_framework: "后端框架",
  networking: "网络协议",
  system_design: "系统设计",
  test: "测试",
};

const tagDisplayNameMap: Record<string, string> = {
  redis: "Redis",
  mq: "消息队列",
  mysql: "MySQL",
  threadlocal: "ThreadLocal",
  concurrency: "并发",
  jvm: "JVM",
  spring: "Spring",
  network: "网络",
  design: "系统设计",
  java: "Java",
  java_concurrency: "Java 并发",
  lock: "锁",
  kafka: "Kafka",
  rabbitmq: "RabbitMQ",
  rocketmq: "RocketMQ",
  distributed_system: "分布式系统",
  database: "数据库",
  backend_framework: "后端框架",
  networking: "网络协议",
  system_design: "系统设计",
};

function normalizeTaxonomyKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function formatTaxonomyLabel(
  value: string | null | undefined,
  displayNameMap: Record<string, string>,
) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return displayNameMap[normalizeTaxonomyKey(trimmedValue)] ?? trimmedValue;
}

export function formatCategoryLabel(value: string | null | undefined) {
  return formatTaxonomyLabel(value, categoryDisplayNameMap);
}

export function formatCategoryLabelOrFallback(
  value: string | null | undefined,
  fallback = "未分类",
) {
  return formatCategoryLabel(value) ?? fallback;
}

export function formatTagLabel(value: string | null | undefined) {
  return formatTaxonomyLabel(value, tagDisplayNameMap);
}

export function formatTagLabels(values: string[]) {
  return values.map((value) => formatTagLabel(value) ?? value);
}
