import type { AgentToolCatalog, AgentToolDefinition, AgentToolPreset } from "@/types/contracts";

export function normalizeToolValues(values?: string[] | null): string[] {
  if (!values?.length) {
    return [];
  }
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

export function resolveAgentAllowedTools(
  toolPresetKey: string | null | undefined,
  allowedToolsExtra: string[] | null | undefined,
  deniedTools: string[] | null | undefined,
  presets: AgentToolPreset[],
): string[] {
  const presetTools = toolPresetKey
    ? presets.find((preset) => preset.key === toolPresetKey)?.tools ?? []
    : [];
  const deniedSet = new Set(normalizeToolValues(deniedTools));
  return normalizeToolValues([...presetTools, ...normalizeToolValues(allowedToolsExtra)])
    .filter((tool) => !deniedSet.has(tool));
}

export function buildAgentToolOptions(
  tools: AgentToolDefinition[],
  additionalValues?: string[] | null,
) {
  const options = new Map(
    tools.map((tool) => [
      tool.value,
      {
        value: tool.value,
        label: `${tool.value} - ${tool.description}`,
      },
    ]),
  );
  normalizeToolValues(additionalValues).forEach((value) => {
    if (!options.has(value)) {
      options.set(value, {
        value,
        label: `${value} - custom`,
      });
    }
  });
  return Array.from(options.values()).sort((left, right) => left.value.localeCompare(right.value));
}

export function emptyAgentToolCatalog(): AgentToolCatalog {
  return {
    tools: [],
    presets: [],
  };
}
