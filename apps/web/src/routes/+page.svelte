<script lang="ts">
  import { api, type Health, type HumanDecision, type RepoFile, type TemplateCard, type UploadedContext, type WorkflowArtifact, type WorkflowRunResponse } from '$lib/api/client';

  type Stage = 'design' | 'context' | 'questions' | 'run' | 'artifacts';

  const questions = [
    { id: 'target_n8n', text: 'Generate a concrete n8n implementation README?' },
    { id: 'target_zapier_make', text: 'Generate Zapier/Make implementation instructions?' },
    { id: 'generate_skill', text: 'Generate a reusable SKILL.md?' },
    { id: 'include_mcp_contract', text: 'Generate an MCP tool contract?' },
    { id: 'require_tests', text: 'Require a test-first gate?' },
    { id: 'require_security_gate', text: 'Require a defensive security gate?' },
    { id: 'human_approval', text: 'Require human approval before side effects?' }
  ];

  let stage = $state<Stage>('design');
  let health = $state<Health | null>(null);
  let templates = $state<TemplateCard[]>([]);
  let selectedTemplates = $state<string[]>(['repo_to_release', 'n8n_agentic_automation', 'tdd_feature_builder', 'security_validation']);
  let upload = $state<UploadedContext | null>(null);
  let files = $state<RepoFile[]>([]);
  let selectedFiles = $state<string[]>([]);
  let query = $state('');
  let objective = $state('Build a repository-aware workflow that reviews code, validates release readiness, gates risky actions, and generates implementation artifacts.');
  let useLlm = $state(true);
  let decisions = $state<Record<string, 'yes' | 'no'>>({
    target_n8n: 'yes',
    target_zapier_make: 'no',
    generate_skill: 'yes',
    include_mcp_contract: 'yes',
    require_tests: 'yes',
    require_security_gate: 'yes',
    human_approval: 'yes'
  });
  let result = $state<WorkflowRunResponse | null>(null);
  let activeArtifact = $state('SKILL.md');
  let loading = $state(false);
  let error = $state('');
  let copied = $state('');

  const filteredFiles = $derived(files.filter((file) => {
    const q = query.toLowerCase();
    return !q || `${file.path} ${file.kind}`.toLowerCase().includes(q);
  }));

  const selectedArtifact = $derived(result?.artifacts.find((artifact) => artifact.name === activeArtifact) ?? result?.artifacts[0] ?? null);

  function toggleTemplate(id: string) {
    selectedTemplates = selectedTemplates.includes(id) ? selectedTemplates.filter((item) => item !== id) : [...selectedTemplates, id];
  }

  function toggleFile(path: string) {
    selectedFiles = selectedFiles.includes(path) ? selectedFiles.filter((item) => item !== path) : [...selectedFiles, path];
  }

  function answer(id: string, value: 'yes' | 'no') {
    decisions = { ...decisions, [id]: value };
  }

  function decisionPayload(): HumanDecision[] {
    return questions.map((question) => ({ id: question.id, question: question.text, answer: decisions[question.id] ?? 'no' }));
  }

  async function uploadRepo(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    loading = true;
    error = '';
    try {
      upload = await api.upload(file);
      const data = await api.files(upload.session_id);
      files = data.files;
      selectedFiles = data.default_targets;
      stage = 'context';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Upload failed';
    } finally {
      loading = false;
    }
  }

  async function runWorkflow() {
    loading = true;
    error = '';
    stage = 'run';
    try {
      result = await api.run({
        session_id: upload?.session_id ?? null,
        objective,
        template_ids: selectedTemplates,
        target_files: selectedFiles,
        require_approval: decisions.human_approval === 'yes',
        use_llm: useLlm,
        human_decisions: decisionPayload()
      });
      activeArtifact = result.artifacts[0]?.name ?? 'SKILL.md';
      stage = 'artifacts';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Workflow generation failed';
      stage = 'questions';
    } finally {
      loading = false;
    }
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    copied = label;
    setTimeout(() => copied = '', 1400);
  }

  function artifactLabel(artifact: WorkflowArtifact) {
    if (artifact.kind === 'skill_md') return 'Skill';
    if (artifact.kind === 'technical_schema') return 'Schema';
    if (artifact.kind === 'n8n_readme') return 'n8n';
    if (artifact.kind === 'zapier_make_readme') return 'Zapier/Make';
    if (artifact.kind === 'mcp_contract') return 'MCP';
    return 'Runbook';
  }

  $effect(() => {
    api.health().then((data) => health = data).catch(() => {});
    api.templates().then((data) => templates = data).catch(() => {});
  });
</script>

<svelte:head><title>FlowForge Workflow Builder</title></svelte:head>

<main class="studio">
  <aside class="sidebar">
    <div class="brand"><span>◇</span><strong>FlowForge</strong></div>
    <nav aria-label="Workflow stages">
      <button type="button" class:active={stage === 'design'} onclick={() => stage = 'design'}>Design</button>
      <button type="button" class:active={stage === 'context'} disabled={!upload} onclick={() => stage = 'context'}>Context</button>
      <button type="button" class:active={stage === 'questions'} onclick={() => stage = 'questions'}>Decisions</button>
      <button type="button" class:active={stage === 'artifacts'} disabled={!result} onclick={() => stage = 'artifacts'}>Artifacts</button>
    </nav>
    <section class="signal"><i class:live={health?.ai_enabled}></i><span>{health?.ai_enabled ? 'LLM synthesis' : 'Deterministic builder'}</span></section>
  </aside>

  <section class="workspace">
    <header class="hero">
      <div>
        <p>Human-in-the-loop workflow studio</p>
        <h1>Build workflows that produce implementation artifacts, not shallow summaries.</h1>
      </div>
      <button type="button" class="primary" onclick={() => stage = 'questions'} disabled={!objective.trim()}>Review decisions</button>
    </header>

    {#if error}<p class="error">{error}</p>{/if}

    {#if stage === 'design'}
      <section class="grid two">
        <div class="panel stack">
          <label for="objective">Workflow objective</label>
          <textarea id="objective" bind:value={objective}></textarea>

          <label class="check" for="llm">
            <input id="llm" type="checkbox" bind:checked={useLlm} />
            <span>Use LLM refinement when configured</span>
          </label>

          <div class="upload-box">
            <div><strong>Repository or workflow ZIP</strong><p>Optional context. Only selected files are read.</p></div>
            <label class="file-button" for="repo-upload">Choose ZIP</label>
            <input id="repo-upload" class="hidden-file" type="file" accept=".zip" onchange={uploadRepo} />
          </div>
        </div>

        <aside class="panel stack">
          <h2>Workflow patterns</h2>
          {#each templates as template}
            <button type="button" class="template" class:selected={selectedTemplates.includes(template.id)} onclick={() => toggleTemplate(template.id)}>
              <strong>{template.name}</strong>
              <span>{template.summary}</span>
            </button>
          {/each}
        </aside>
      </section>
    {/if}

    {#if stage === 'context' && upload}
      <section class="grid two">
        <div class="panel">
          <div class="panel-head"><h2>{upload.repo_name}</h2><input aria-label="Filter files" placeholder="Filter files" bind:value={query} /></div>
          <div class="file-list">
            {#each filteredFiles as file}
              <button type="button" class:selected={selectedFiles.includes(file.path)} onclick={() => toggleFile(file.path)}>
                <span>{file.path}</span><small>{file.kind}</small>
              </button>
            {/each}
          </div>
        </div>
        <aside class="panel stack compact">
          <h2>Context boundary</h2>
          <p>{selectedFiles.length} files selected. The builder will use only these files for implementation facts.</p>
          <button type="button" class="primary wide" onclick={() => stage = 'questions'}>Continue</button>
        </aside>
      </section>
    {/if}

    {#if stage === 'questions'}
      <section class="grid two">
        <div class="panel stack">
          <h2>Human decisions</h2>
          <p class="muted">These answers shape the final artifacts and approval gates.</p>
          <div class="questions">
            {#each questions as question}
              <article>
                <span>{question.text}</span>
                <div>
                  <button type="button" class:selected={decisions[question.id] === 'yes'} onclick={() => answer(question.id, 'yes')}>Yes</button>
                  <button type="button" class:selected={decisions[question.id] === 'no'} onclick={() => answer(question.id, 'no')}>No</button>
                </div>
              </article>
            {/each}
          </div>
          <button type="button" class="primary wide" onclick={runWorkflow} disabled={loading || !objective.trim()}>{loading ? 'Generating…' : 'Generate implementation artifacts'}</button>
        </div>

        <aside class="panel stack compact">
          <h2>Expected output</h2>
          <ul>
            <li>Reusable SKILL.md</li>
            <li>Advanced technical schema</li>
            <li>n8n and/or Zapier/Make implementation README</li>
            <li>MCP tool contract</li>
            <li>Runbook and JSON/YAML exports</li>
          </ul>
        </aside>
      </section>
    {/if}

    {#if stage === 'run'}
      <section class="panel running"><div class="orb"></div><h2>Generating artifacts</h2><p>Building the workflow schema, approval gates, platform implementation docs, and reusable skill file.</p></section>
    {/if}

    {#if stage === 'artifacts' && result}
      <section class="artifact-layout">
        <div class="panel flow">
          <div class="panel-head"><h2>{result.workflow.title}</h2><button type="button" onclick={() => copyText('report', result.report_markdown)}>{copied === 'report' ? 'Copied' : 'Copy report'}</button></div>
          <div class="lane">
            {#each result.workflow.nodes as node, index}
              <article>
                <b>{String(index + 1).padStart(2, '0')}</b>
                <div>
                  <strong>{node.title}</strong>
                  <p>{node.instruction}</p>
                  {#if node.implementation.length}
                    <ul>{#each node.implementation.slice(0, 4) as step}<li>{step}</li>{/each}</ul>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        </div>

        <aside class="panel artifact-panel">
          <div class="tabs">
            {#each result.artifacts as artifact}
              <button type="button" class:selected={activeArtifact === artifact.name} onclick={() => activeArtifact = artifact.name}>{artifactLabel(artifact)}</button>
            {/each}
          </div>
          {#if selectedArtifact}
            <div class="artifact-head"><h2>{selectedArtifact.name}</h2><button type="button" onclick={() => copyText(selectedArtifact.name, selectedArtifact.content)}>{copied === selectedArtifact.name ? 'Copied' : 'Copy'}</button></div>
            <pre>{selectedArtifact.content}</pre>
          {/if}
        </aside>
      </section>
    {/if}
  </section>
</main>

<style>
  :global(body){margin:0;background:#fbf5ed;color:#181411;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px}.studio{min-height:100vh;display:grid;grid-template-columns:238px minmax(0,1fr)}.sidebar{background:#17110f;color:#fff7ef;padding:22px 16px;display:flex;flex-direction:column;gap:22px;position:sticky;top:0;height:100vh;box-sizing:border-box}.brand{display:flex;align-items:center;gap:10px}.brand span{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:#f9734a;color:#1b100c}.brand strong{font-size:15px}nav{display:grid;gap:7px}nav button{background:transparent;color:#c9b7ad;text-align:left;border:0;border-radius:12px;padding:10px 12px;cursor:pointer}nav button.active,nav button:hover{background:#2b211d;color:#fff}nav button:disabled{opacity:.35}.signal{margin-top:auto;border:1px solid #382822;background:#241a17;border-radius:18px;padding:14px;display:flex;gap:10px;align-items:center}.signal i{width:9px;height:9px;background:#81716b;border-radius:99px}.signal i.live{background:#45d391}.signal span{font-size:13px;color:#e5d4c9}.workspace{padding:24px 30px 40px}.hero{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;margin-bottom:22px}.hero p{margin:0 0 8px;color:#b94d2d;letter-spacing:.14em;text-transform:uppercase;font-size:11px}.hero h1{margin:0;max-width:820px;font-size:32px;line-height:1.02;letter-spacing:-.055em}.primary,button{border:0;border-radius:999px;background:#19120f;color:white;padding:10px 14px;font-size:13px;cursor:pointer}.primary{background:#f05f36;color:#190d08;font-weight:750}button:disabled{opacity:.45;cursor:not-allowed}.error{background:#fff0ec;border:1px solid #efbaa6;color:#923317;border-radius:14px;padding:10px 12px}.grid.two{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:16px}.panel{background:#fffdf9;border:1px solid #ead7c9;border-radius:24px;box-shadow:0 22px 70px rgba(99,55,30,.065);padding:18px}.stack{display:grid;gap:14px}.compact{align-self:start}.muted,.compact p,.compact li,.template span,.lane p,.lane li{font-size:12px;line-height:1.5;color:#6f5f55}h2{font-size:16px;letter-spacing:-.02em;margin:0}label{display:block;font-size:12px;color:#6b5a50}textarea,input{box-sizing:border-box;width:100%;border:1px solid #ead7c9;background:#fff;border-radius:14px;padding:11px 12px;color:#181411;font:inherit}textarea{min-height:170px;line-height:1.5;resize:vertical}.check{display:flex;gap:8px;align-items:center}.check input{width:auto}.upload-box{display:flex;justify-content:space-between;gap:14px;align-items:center;border:1px dashed #e1c0aa;border-radius:18px;background:#fff8f3;padding:14px}.upload-box p{margin:4px 0 0;font-size:12px;color:#6f5f55}.file-button{display:inline-flex;background:#19120f;color:white;border-radius:999px;padding:9px 13px;cursor:pointer;margin:0}.hidden-file{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}.template{text-align:left;background:#fff8f3;color:#181411;border:1px solid #efd9ca;border-radius:16px;padding:13px}.template.selected{background:#19120f;color:white}.template strong{display:block;font-size:13px;margin-bottom:5px}.template.selected span{color:#dac9bd}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:12px}.panel-head input{max-width:240px}.panel-head button,.artifact-head button{background:#fff;color:#19120f;border:1px solid #e1c0aa;padding:7px 11px;font-size:12px}.file-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:9px;max-height:66vh;overflow:auto}.file-list button{text-align:left;background:#fff8f3;color:#181411;border:1px solid #efd9ca;border-radius:14px;padding:11px}.file-list button.selected{background:#2d211b;color:white}.file-list span{display:block;font-size:12px;line-height:1.25;overflow:hidden;text-overflow:ellipsis}.file-list small{font-size:11px;color:#8f786b}.wide{width:100%}.questions{display:grid;gap:10px}.questions article{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border:1px solid #efd9ca;background:#fff8f3;border-radius:16px;padding:12px}.questions span{font-size:13px}.questions div{display:flex;gap:7px}.questions button{background:#fff;color:#19120f;border:1px solid #e1c0aa;padding:8px 12px}.questions button.selected{background:#19120f;color:#fff}.running{text-align:center;padding:70px 20px}.orb{width:48px;height:48px;border-radius:50%;background:#f9734a;margin:0 auto 16px;animation:pulse 1.5s infinite}@keyframes pulse{to{box-shadow:0 0 0 30px rgba(240,95,54,0)}}.artifact-layout{display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:16px}.lane{display:grid;gap:10px}.lane article{display:grid;grid-template-columns:44px 1fr;gap:12px;border:1px solid #efd9ca;background:#fff8f3;border-radius:18px;padding:14px}.lane b{display:grid;place-items:center;width:34px;height:34px;background:#19120f;color:#fff;border-radius:12px;font-size:12px}.lane strong{display:block;font-size:14px}.lane p{margin:5px 0}.lane ul{margin:8px 0 0;padding-left:18px}.artifact-panel{display:grid;grid-template-rows:auto auto minmax(0,1fr);align-self:start;max-height:calc(100vh - 70px)}.tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.tabs button{background:#fff8f3;color:#19120f;border:1px solid #efd9ca;padding:8px 10px;font-size:12px}.tabs button.selected{background:#19120f;color:#fff}.artifact-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}pre{margin:0;max-height:64vh;overflow:auto;border-radius:16px;background:#19120f;color:#fff4ec;padding:12px;font-size:11px;line-height:1.45;white-space:pre-wrap}@media(max-width:1120px){.studio{grid-template-columns:1fr}.sidebar{position:static;height:auto}.grid.two,.artifact-layout{grid-template-columns:1fr}.hero{display:grid}}
</style>
