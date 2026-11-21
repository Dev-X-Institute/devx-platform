# **Platform AI Architecture — Production Readiness & Ghana Deployment**

## **1. Executive summary**

The original architecture is fundamentally sound. Its strongest decisions should be preserved:

- Provider-neutral AI interface.
- App-specific Edge Function entry points.
- Provider credentials and model calls on the server.
- Authentication, authorization, validation, and rate limits at the Edge Function boundary.
- RLS and least-privilege database access.
- Human review before AI-generated educational content becomes authoritative.
- Synchronous execution for bounded tasks.
- Durable queues and workers for longer-running tasks.
- Shared AI infrastructure, while application features retain ownership of their policies.

The research reinforces these choices and adds the governance and operational controls needed before production.

For Ghana, the most significant adjustments are not a fundamental change to the technical architecture. They are additions to the **data protection, consent, vendor, cross-border processing, incident response, retention, and operational governance layers**.

The recommended approach is:

> Build a Ghana-ready education AI platform using the existing Supabase architecture, introduce a narrowly scoped AI pilot with adult oversight, and establish legal, privacy, financial, and operational controls before processing real learner data.

## **2. Architecture principles and boundaries**

These remain the foundational decisions.

| Layer                       | Responsibility                                                                                  | Boundary                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| App frontend                | Feature input, invocation, display, feedback, review                                            | No provider keys, privileged access, or trust decisions  |
| `@devx/ai`                  | Shared contracts, request/result types, transport adapter                                       | No prompts containing app policy, provider SDKs, secrets |
| Supabase Edge Functions     | Authentication, authorization, validation, limits, invocation, safe usage metadata              | No unrestricted AI endpoint                              |
| Server-side AI service      | Provider abstraction, model configuration, parsing, timeouts, retries, safety and cost controls | No app-specific educational decisions                    |
| App feature policy          | Prompts, data scope, roles, review, evaluations                                                 | No shared provider implementation                        |
| Durable task infrastructure | Queued execution, progress, retries, cancellation                                               | No unrestricted agent execution                          |
| Governance                  | Legal compliance, provider approval, retention, budgets, risk management                        | Must not be bypassed by application code                 |

### **Request flow**

```text
App screen
    │
    ▼
@devx/ai (browser-safe contract)
    │
    ▼
@devx/core → createBackend()
    │
    ▼
Supabase Auth JWT
    │
    ▼
App-specific Edge Function
    │
    ├── Authenticate
    ├── Authorize
    ├── Validate schema
    ├── Apply quotas
    ├── Minimize data
    └── Apply feature policy
             │
             ▼
     Server-side AI service
             │
             ▼
       Provider adapter
             │
             ▼
       Approved AI provider
```

The frontend continues using the existing shared Supabase client. The browser never directly calls AI providers.

## **3. Ghana deployment model**

### **3.1 Jurisdiction and data controller responsibilities**

The platform should distinguish the responsibilities of the education institution and DevX.

The uploaded Ghana research identifies schools or institutions as likely data controllers and the platform infrastructure provider as a processor, depending on the contractual and operational arrangement.

Recommended model:

- Schools are responsible for their student records and lawful purposes of processing.
- DevX provides the platform and processes data according to agreed instructions.
- DevX must define its own controller responsibilities for accounts, product analytics, support, security logs, and other data it determines the purpose of processing.
- Contracts must clearly allocate responsibilities, including consent, user rights, security incidents, retention, and subprocessors.

This should be verified with Ghana-qualified legal counsel, especially where DevX determines purposes independently of the school.

### **3.2 Data Protection Commission registration**

The Ghana research identifies registration under the Data Protection Act, 2012 (Act 843) as an important pre-production requirement for data controllers.

**Recommended production gate:**

- Identify the relevant controller(s).
- Confirm applicable registration requirements.
- Obtain and retain evidence of registration.
- Document the purposes of processing.
- Document categories of personal data.
- Document recipients and processors.
- Document countries where data may be transferred.
- Document retention periods and data-subject rights procedures.

The architecture should support this documentation by maintaining a data-flow and vendor registry.

### **3.3 Cross-border processing**

The research indicates that Ghana does not impose a general data-localization requirement for ordinary educational data, but cross-border transfers and the destination countries should be disclosed appropriately.

Therefore:

- Do not require Ghana-only hosting as a technical prerequisite.
- Record the hosting region of Supabase.
- Record the countries in which AI providers process data.
- Record analytics, email, SMS, support, storage, and backup providers.
- Confirm each school's disclosure and registration obligations.
- Ensure provider agreements and privacy terms are suitable for educational and minor data.
- Provide appropriate disclosure to users.

A foreign cloud region is not automatically noncompliant. The important decision is informed, documented, and appropriately safeguarded processing.

### **3.4 Regional hosting**

Recommended default:

- Use a cloud region that balances latency, reliability, provider availability, and contractual protections.
- Prefer a region geographically close to Ghana where practical.
- Treat local hosting as a future optimization or customer requirement rather than an assumed legal obligation.
- Re-evaluate regional hosting if government, institutional, contractual, or sector-specific requirements emerge.

## **4. AI provider and account selection**

### **Decision**

**Do not approve a provider solely because it offers a free tier or convenient API.**

Provider approval should be based on:

| Criteria              | Required assessment                               |
| --------------------- | ------------------------------------------------- |
| Ghana availability    | Is Ghana supported for the service?               |
| Age restrictions      | Can the service support the intended learners?    |
| Data use              | Is submitted data used for model training?        |
| Retention             | What happens to prompts, responses, and logs?     |
| Data processing       | Can a suitable DPA be obtained?                   |
| Regions               | Where are inference and storage performed?        |
| Subprocessors         | Which other organizations process the data?       |
| Security              | What security certifications and controls exist?  |
| Reliability           | What availability and support are provided?       |
| Cost                  | What are the model, token, and operational costs? |
| Education suitability | Are the terms suitable for student use?           |
| Abuse prevention      | What safeguards exist for harmful outputs?        |

### **Recommended account structure**

#### **Development**

Mock provider, synthetic data, developer credentials

#### **Testing / staging**

Evaluation datasets, test credentials, controlled usage

#### **Production**

Approved provider, restricted credentials, real-user safeguards

Keep production data and credentials isolated from development.

### **Model governance**

Create a simple AI Feature Registry.

| Feature               | Owner          | Provider | Model | Data category           | Risk       | Approval       |
| --------------------- | -------------- | -------- | ----- | ----------------------- | ---------- | -------------- |
| `quiz.generate`       | Education team | TBD      | TBD   | Lesson content          | Low/medium | Teacher        |
| `lesson.explain`      | Education team | TBD      | TBD   | Lesson + question       | Low/medium | Policy-defined |
| `performance.summary` | Education team | TBD      | TBD   | Student assessment data | Higher     | Teacher        |
| `report.comment`      | Education team | TBD      | TBD   | Student records         | Higher     | Teacher        |

Each feature should record:

- Intended purpose.
- Owner.
- Authorized roles.
- Provider and model.
- Data fields submitted.
- Region and subprocessors.
- Output schema.
- Review/approval requirement.
- Evaluation suite.
- Usage and cost limits.
- Retention policy.

This registry can initially be a version-controlled YAML file or a table in the repository. A governance platform is unnecessary at this stage.

## **5. Ghana privacy, children, and consent**

### **5.1 User categories**

The system must distinguish user categories rather than treating everyone as a generic learner.

| User category           | Data handling                                                         |
| ----------------------- | --------------------------------------------------------------------- |
| Learners under 18       | Additional protection, consent/guardian process, minimized collection |
| Adult learners, 18+     | Adult consent and data-subject rights                                 |
| Teachers                | Personal data protections, role-based access                          |
| Parents/guardians       | Personal data protections and restricted access to linked children    |
| School administrators   | School-scoped permissions and auditability                            |
| Institutional customers | Contractual controller/processor responsibilities                     |

### **5.2 Children and parental consent**

The Ghana research identifies children under 18 as a specially protected category under the relevant Ghanaian legal framework.

**Recommended system behavior:**

- Capture age or age category where legally and operationally appropriate.
- Establish a guardian-consent workflow for minors.
- Do not treat the learner's own account as sufficient authorization where parental consent is required.
- Maintain evidence of consent.
- Allow consent withdrawal.
- Restrict account capabilities when consent is absent or withdrawn.
- Prevent unnecessary profiling, advertising, and automated high-impact decisions.
- Ensure children cannot independently authorize sensitive or consequential actions.

Important legal qualification: the precise interpretation and implementation of parental consent under Act 843 should be confirmed by Ghana-qualified counsel. The research itself notes that the wording around parental control and consent requires legal interpretation.

### **5.3 Consent and authorization are separate**

Consent should not replace authorization.

For example:

- A parent may consent to a child using the platform.
- That does not authorize the parent to see another child's records.
- A teacher may be authorized to generate quiz drafts.
- That does not authorize the teacher to access all students in all schools.
- A school administrator may access school records.
- That does not authorize unrestricted AI processing of those records.

Enforce permissions server-side using trusted identities, relationships, and database policies.

### **5.4 Privacy notices**

Provide clear notices describing:

- What data is collected.
- Why it is collected.
- Which AI features process it.
- Which third parties receive it.
- Whether data is processed outside Ghana.
- How long it is retained.
- How users exercise access, correction, and deletion rights.
- How AI-generated content is identified.
- How guardian consent and withdrawal work.

The notices should use accessible English and, where useful for the intended users, locally relevant language support.

## **6. Data minimization and AI inference**

The existing data-minimization approach should be strengthened for Ghanaian education deployment.

### **Data that should generally not be sent to AI providers**

Unless a feature has an approved, explicit requirement:

- Student names.
- Email addresses.
- Student identification numbers.
- Phone numbers.
- Parent contact details.
- School identifiers.
- Full profiles.
- Unnecessary grades or assessment records.
- Sensitive behavioral or disciplinary information.

### **Recommended data preparation**

```text
Database
   │
   ▼
Authorized feature query
   │
   ▼
Server-side data minimization
   │
   ├── Remove identifiers
   ├── Restrict fields
   ├── Check feature permissions
   ├── Limit content length
   └── Validate data category
            │
            ▼
     Approved AI provider
```

For example, instead of sending:

```json
{
  "studentName": "Full Name",
  "studentId": "12345",
  "school": "Example School",
  "grades": "...",
  "teacherNotes": "..."
}
```

Prefer a feature-specific payload that includes only the information necessary for the requested task, with identifying fields removed where possible.

## **7. Logging, metadata, and retention**

### **7.1 Usage metadata**

Log only what is required for operations, security, evaluation, and cost management.

Recommended metadata:

| Field                      | Purpose                          |
| -------------------------- | -------------------------------- |
| Request ID                 | Trace a request                  |
| App / feature              | Governance and reporting         |
| Pseudonymous actor ID      | Abuse and usage analysis         |
| Provider / model / version | Reproducibility                  |
| Timestamp                  | Audit and operational monitoring |
| Duration                   | Performance                      |
| Token usage                | Cost                             |
| Estimated cost             | Budget control                   |
| Status                     | Success/failure                  |
| Error category             | Troubleshooting                  |
| Review status              | Accountability where applicable  |

Avoid logging raw prompts and answers by default.

### **7.2 Retention policy**

Retention should be configurable by data category.

Suggested starting policy

| Data                         | Recommended starting approach                                            |
| ---------------------------- | ------------------------------------------------------------------------ |
| Raw inference input          | Not retained by application logs                                         |
| Raw AI response              | Not retained by default; session display only unless feature requires it |
| Operational metadata         | Short, defined retention                                                 |
| Security audit records       | Defined retention appropriate to security and legal requirements         |
| Persisted educational output | Retained according to its educational purpose and institutional policy   |
| Failed task metadata         | Retain only what is needed for troubleshooting                           |
| Queue payloads               | Keep minimal and expire after completion/retention period                |
| Consent records              | Retain as evidence according to legal requirements                       |

The research suggests short retention for AI-related operational logs, but the exact duration must be decided according to Ghanaian law, school contracts, security requirements, and the intended purpose.

Implement automated deletion rather than relying on manual cleanup.

### **7.3 User rights and deletion**

The architecture should support:

- Access requests.
- Correction.
- Deletion where applicable.
- Consent withdrawal.
- Account closure.
- Data export where appropriate.
- Deletion propagation to relevant systems and subprocessors.

Deletion must account for:

- Primary database.
- AI-related output records.
- Analytics systems.
- Logs.
- Object storage.
- Queue/task records.
- Backups, according to backup lifecycle and legal requirements.

## **8. Security and incident response**

### **Security controls**

These controls are consistent with the original architecture and Ghana research:

- TLS for all external communication.
- Encryption at rest.
- Least-privilege roles.
- RLS for user-scoped data.
- Server-side authorization.
- Secrets stored only in Supabase Edge Function secrets or an approved secret manager.
- No provider keys in `VITE_*` variables.
- Restricted service-role usage.
- Auditable privileged operations.
- Rate limiting.
- Payload limits.
- Provider timeouts.
- Security review before production.

### **Incident response**

Establish one incident response process that accounts for the relevant Ghanaian notification requirements.

The research identifies:

- Cybersecurity incident reporting obligations potentially involving a 24-hour reporting window.
- Data Protection Act breach notification obligations to the DPC and affected individuals as soon as reasonably practicable.

The exact applicability of Cybersecurity Act reporting provisions to DevX, schools, and specific incidents should be confirmed with legal counsel.

Recommended operational process:

```text
Incident detected
      │
      ▼
Immediate containment
      │
      ▼
Security / privacy classification
      │
      ▼
Determine affected systems and data
      │
      ▼
Legal notification assessment
      │
      ├── Cybersecurity Authority / CERT
      ├── Data Protection Commission
      └── Affected users / institutions
      │
      ▼
Remediation and recovery
      │
      ▼
Incident report and lessons learned
```

### **Minimum production evidence**

- Incident response policy.
- Named incident owner.
- Notification templates.
- Contact list for relevant authorities.
- Incident severity classification.
- Escalation process.
- Breach simulation or tabletop exercise.

## **9. Cost controls and usage governance**

Cost control should be implemented before the first live pilot.

### **9.1 Multi-layer controls**

Use three layers:

1. **Request limits** — per-user and per-feature usage limits.
2. **Application budgets** — maximum usage or spending by feature and environment.
3. **Provider/cloud budgets** — account-level alerts and resource restrictions.

### **Suggested initial controls**

| Control           | Recommendation                                                          |
| ----------------- | ----------------------------------------------------------------------- |
| Per-user quota    | Configurable daily limits                                               |
| Per-feature quota | Different limits for each feature                                       |
| Request size      | Explicit text/input limits                                              |
| Output size       | Explicit response limits                                                |
| Timeout           | Bounded per request                                                     |
| Retry             | Limited to transient errors                                             |
| Monthly AI budget | Fixed pilot budget                                                      |
| Alerts            | 50%, 75%, 90%                                                           |
| Budget exhaustion | Disable nonessential AI features or return controlled unavailable state |
| Cost reporting    | Usage by app, feature, model and environment                            |

The research proposes thresholds such as 50%, 75%, and 90%. These should be treated as starting values rather than universal industry standards.

### **Ghana-specific financial considerations**

- Track costs in the provider's billing currency.
- Report budgets in both the operational billing currency and GHS if that helps the team.
- Account for currency conversion and exchange-rate changes.
- Verify applicable Ghanaian tax treatment for software and AI services.
- If schools or families pay, consider GHS pricing and locally accessible payment methods.
- Avoid relying on free-tier credits for production reliability.

## **10. AI output review and persistence**

The original architecture's human-review principle should remain.

### **Feature-specific output policy**

| Feature                 | Default output handling                           |
| ----------------------- | ------------------------------------------------- |
| Teacher quiz generation | Draft; teacher edits and approves                 |
| Lesson explanation      | Display with grounding and appropriate safeguards |
| Performance summary     | Teacher review before official use                |
| Report-card comment     | Teacher edits and approves                        |
| Student-risk flag       | Deterministic evidence; teacher review            |
| Parent communication    | Approval before sending                           |
| Fee reminder            | Deterministic calculation and approved template   |
| Attendance notification | Deterministic workflow                            |
| AI agent write action   | Explicit confirmation or approval                 |

### **Persistence rule**

> AI-generated content must not silently become an official educational record, trigger consequential action, or be communicated externally without the feature's approved review policy.

For persistent outputs, record:

- Generated content or approved artifact.
- Source data or evidence reference.
- Feature ID.
- Model/version where appropriate.
- Creation timestamp.
- Author/initiator.
- Review status.
- Reviewer.
- Approval timestamp.
- Any subsequent edits.

Avoid storing raw chain-of-thought, hidden provider reasoning, or unnecessary internal model artifacts.

## **11. Reliability and degraded-mode strategy**

The research recommends circuit breakers, retries, fallback providers, and graceful degradation. For DevX's initial pilot, the implementation should be simpler.

### **Initial pilot recommendation**

```text
Request
  │
  ▼
Primary approved provider
  │
  ├── Success → Return validated result
  │
  ├── Transient error → Bounded retry
  │
  ├── Rate limit → Honor retry-after / controlled response
  │
  └── Persistent failure
           │
           ▼
     Controlled unavailable response
```

### **Per-feature degraded mode**

| Feature                | Degraded behavior                                  |
| ---------------------- | -------------------------------------------------- |
| Quiz generation        | Allow manual quiz creation                         |
| Lesson explanation     | Show lesson content and indicate AI is unavailable |
| AI summary             | Defer generation                                   |
| AI report comment      | Allow manual writing                               |
| Parent/admin assistant | Disable AI; retain normal portal functionality     |
| Background task        | Queue/retry if appropriate                         |
| External messaging     | Do not send duplicate or unapproved messages       |

### **Later enhancements**

Defer the following until there is a demonstrated need:

- Multi-provider failover.
- Multi-cloud AI routing.
- Automated model selection.
- Complex circuit-breaker infrastructure.
- Provider redundancy for every feature.

A well-designed failure response is more valuable during the pilot than premature multi-provider complexity.

## **12. Durable queues and background workers**

The original long-running task design is correct and should be retained.

### **Recommended initial approach**

For DevX's Supabase-based infrastructure, evaluate **Supabase Queues (pgmq)** as the first option, provided its operational capabilities meet the feature requirements.

The research notes that pgmq offers durable queue storage but may require application-managed retry and dead-letter behavior.

### **Queue lifecycle**

```text
App
 │
 ▼
App-specific Edge Function
 │
 ├── Authenticate
 ├── Authorize
 ├── Validate
 ├── Check quota
 ├── Create task
 └── Enqueue task ID
       │
       ▼
  Durable queue
       │
       ▼
     Worker
       │
 ├── Claim task
 ├── Check cancellation
 ├── Load authorized data
 ├── Apply feature policy
 ├── Execute bounded steps
 ├── Validate result
 └── Record status
       │
       ▼
  Task status / result
       │
       ▼
  Authorized frontend
```

### **Task requirements**

Every task should have:

- Task ID.
- App ID.
- Feature ID.
- Owner.
- Status.
- Creation timestamp.
- Deadline.
- Attempt count.
- Maximum attempts.
- Idempotency key.
- Maximum steps.
- Cost/token budget.
- Cancellation state.
- Result schema.
- Safe error category.
- Retention policy.

### **Task states**

```text
queued
  │
  ▼
processing
  │
  ├── succeeded
  ├── failed
  ├── cancelled
  └── needs_review
```

### **Retry policy**

Recommended initial default:

- Retry transient errors only.
- Use exponential backoff.
- Set a maximum attempt count.
- Do not retry permanent validation or authorization failures.
- Make side effects idempotent.
- Move exhausted tasks to a dead-letter/review state.
- Monitor queue depth and dead-letter activity.

The exact retry count should be configurable by task type. The research's 3–5 retry suggestion is a reasonable starting range, not a fixed requirement.

### **Queue selection**

| Option          | Advantages                        | Considerations                                        |
| --------------- | --------------------------------- | ----------------------------------------------------- |
| Supabase Queues | Integrated with Supabase/Postgres | Implement retry limits and DLQ handling explicitly    |
| AWS SQS         | Mature managed queue, DLQ support | Additional cloud infrastructure                       |
| Google Pub/Sub  | Managed scalable messaging        | Additional infrastructure and operational integration |

**Recommendation:** Start by evaluating Supabase Queues. Do not introduce a second cloud infrastructure solely for a queue unless requirements justify it.

## **13. Agent tools and approval gates**

The original architecture correctly treats agentic work as a separate capability, not as a default AI feature.

### **Initial policy**

**No external tools for the initial AI pilot.**

The first AI features should be bounded generation and explanation without:

- Database write access.
- Arbitrary HTTP requests.
- Email or messaging.
- File system access.
- Shell or code execution.
- Browser automation.
- Access to credentials.

### **When tools become necessary**

Create a tool registry:

| Tool                      | Purpose                           | Access           | Risk        | Approval         |
| ------------------------- | --------------------------------- | ---------------- | ----------- | ---------------- |
| Lesson retrieval          | Retrieve permitted lesson content | Read-only        | Low         | No               |
| Student performance query | Retrieve authorized facts         | Scoped read-only | Medium/high | Policy-specific  |
| Save quiz draft           | Persist draft                     | Scoped write     | Medium      | Teacher approval |
| Send message              | External communication            | Restricted       | High        | Required         |
| Publish quiz              | Make content visible              | Restricted       | High        | Required         |
| Modify student record     | Change educational data           | Restricted       | High        | Required         |

### **Agent security requirements**

- Tool allowlist.
- App-specific permissions.
- Feature-specific policy.
- Explicit network allowlist where network access exists.
- Credentials injected server-side.
- No direct access to secrets.
- Bounded steps.
- Bounded runtime.
- Bounded token and cost budget.
- Human confirmation for consequential side effects.
- Auditable tool execution.
- Cancellation support.

Do not create a generic public `runAgent()` function.

## **14. Education feature roadmap**

The original proposed features should be separated into deterministic workflows and AI-assisted workflows.

### **Phase A — Initial pilot**

#### **Teacher quiz draft generation**

- Input: lesson content.
- Output: structured quiz drafts.
- Teacher reviews, edits, and approves.
- No automatic publishing.
- Minimal personal data.

#### **Student lesson helper**

- Input: lesson-scoped question.
- Output: concise explanation.
- Grounded in lesson material.
- No student identity sent to provider.
- Must indicate when the lesson does not contain sufficient information.

### **Phase B — Additional AI features**

| Feature                | Approach                                   | Gate                   |
| ---------------------- | ------------------------------------------ | ---------------------- |
| Performance summaries  | AI draft from prepared facts               | Teacher review         |
| Report-card comments   | AI draft grounded in rubric and evidence   | Teacher approval       |
| Parent/admin assistant | Retrieval-based, role-specific assistant   | Strict data scope      |
| Lesson preparation     | AI generation from teacher-selected inputs | Teacher review         |
| Study recommendations  | Rules + optional AI wording                | Teacher/learner review |

### **Phase C — Deterministic workflows**

These should not be AI-powered simply because they appear in an AI feature roadmap.

| Feature                  | Recommended implementation             |
| ------------------------ | -------------------------------------- |
| Declining performance    | Deterministic thresholds and trends    |
| School fee reminders     | Database balance + deterministic rules |
| Attendance notifications | Event-driven workflow                  |
| Parent notifications     | Authorized, templated communication    |
| Scheduling               | Deterministic rules                    |
| Report-card calculations | Deterministic calculations             |

AI can help draft the wording, but it should not calculate fees, determine attendance, or make consequential student decisions.

## **15. Evaluation and quality assurance**

Before production, each AI feature must have an evaluation suite.

### **Minimum evaluation dimensions**

| Dimension           | Evaluation                                                   |
| ------------------- | ------------------------------------------------------------ |
| Correctness         | Does the answer accurately reflect the input?                |
| Grounding           | Does it avoid inventing unsupported facts?                   |
| Format              | Does it satisfy the output schema?                           |
| Safety              | Does it avoid harmful or inappropriate output?               |
| Age appropriateness | Is the output suitable for the intended learner?             |
| Bias                | Are there problematic assumptions or discriminatory outputs? |
| Latency             | Is response time acceptable?                                 |
| Cost                | Is the cost per successful task acceptable?                  |
| Reliability         | How often does it fail or produce malformed output?          |

### **Evaluation approach**

- Use synthetic or non-identifying examples.
- Include normal and adversarial examples.
- Evaluate provider/model changes before deployment.
- Keep a regression suite.
- Record model version and evaluation results.
- Require acceptance thresholds per feature.

For the initial quiz generator, evaluate:

- Question correctness.
- Answer correctness.
- Alignment with lesson material.
- Appropriate difficulty.
- Duplicate questions.
- Ambiguous wording.
- Structured output validity.
- Teacher editing burden.

For the lesson helper, evaluate:

- Correctness.
- Grounding.
- Unsupported claims.
- Appropriate explanations.
- Refusal/uncertainty behavior.

## **16. Consolidated decision register**

This is the recommended register for the team to use to settle production readiness.

| Priority | Decision                | Recommended default                                                 | Owner                    | Acceptance criteria                          |
| -------- | ----------------------- | ------------------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| P0       | Ghana legal compliance  | Complete legal review before real learner data                      | Legal / Compliance       | Applicable requirements documented           |
| P0       | DPC registration        | Confirm and complete required registration                          | Compliance               | Evidence of registration on file             |
| P0       | Children’s consent      | Guardian consent workflow for minors, subject to legal confirmation | Product / Legal          | Tested consent flow and consent records      |
| P0       | AI provider             | Approve one provider with suitable privacy terms                    | Engineering / Legal      | Provider assessment and agreement            |
| P0       | Cross-border transfers  | Document every destination country and subprocessor                 | Data / Legal             | Data-flow inventory complete                 |
| P0       | Privacy notice          | Ghana-specific notice and rights procedures                         | Product / Legal          | Published and accessible                     |
| P0       | Data minimization       | No unnecessary student identifiers in inference                     | Engineering              | Verified payload tests                       |
| P0       | Security                | TLS, encryption, RLS, least privilege                               | Engineering              | Security review passed                       |
| P0       | Retention               | Define and implement retention by data category                     | Privacy / Engineering    | Automated deletion tested                    |
| P0       | Incident response       | Ghana-aware response and notification procedures                    | Security                 | Incident simulation completed                |
| P0       | Output approval         | Teacher approval before publishing quiz drafts                      | Product / Education      | Approval workflow tested                     |
| P0       | Cost controls           | Quotas and budget alerts                                            | Engineering / Finance    | Limit tests and alerts verified              |
| P0       | Provider secrets        | Server-side secrets only                                            | Engineering              | No credentials in frontend                   |
| P1       | Model governance        | Registry for every AI feature                                       | AI / Engineering         | Feature registry completed                   |
| P1       | Evaluation              | Evaluation suite for initial features                               | AI / Education           | Evaluation thresholds passed                 |
| P1       | Degraded mode           | Controlled failure per feature                                      | Engineering              | Outage tests completed                       |
| P1       | Usage metadata          | Minimal operational metadata                                        | Engineering              | Logs reviewed for PII                        |
| P1       | Queue technology        | Evaluate Supabase Queues                                            | Engineering              | Prototype and reliability tests              |
| P1       | Task lifecycle          | Retry, cancellation, DLQ, retention                                 | Engineering              | Lifecycle tests completed                    |
| P1       | Ghana payment model     | GHS pricing and local payment feasibility                           | Product / Finance        | Pricing and payment decision                 |
| P2       | Multi-provider fallback | Defer until justified                                               | Engineering              | Decision revisited based on reliability      |
| P2       | Agent tools             | Initially disabled                                                  | Security / Engineering   | Tool risk review before activation           |
| P2       | Advanced monitoring     | Expand when usage grows                                             | Engineering / Operations | Metrics requirements defined                 |
| P2       | Local hosting           | Optional, not assumed mandatory                                     | Architecture             | Revisit for customer/regulatory requirements |

## **17. Decisions required before the real-learner pilot**

The following must not be deferred.

### **Legal and privacy**

- Confirm the legal entity/controller and processor relationships.
- Confirm applicable DPC registration requirements and obtain evidence.
- Obtain Ghana-qualified legal review of child-consent requirements.
- Establish guardian consent and withdrawal procedures.
- Publish privacy notices.
- Document cross-border data flows.
- Approve provider terms and data processing agreements.
- Complete a privacy impact assessment.
- Establish data retention and deletion procedures.
- Establish data-subject request handling.

### **Engineering**

- Authentication and server-side authorization.
- RLS and role/relationship checks.
- Input and output validation.
- Request size limits.
- Rate limits.
- Timeouts and bounded retries.
- Safe error responses.
- Provider secrets securely stored.
- PII minimization.
- Logging policy.
- Budget controls.
- Human approval workflow.
- Feature-specific degraded mode.

### **Operational**

- Incident response plan.
- Notification assessment process.
- Monitoring and alerting.
- Cost dashboard.
- Provider outage test.
- Security review.
- AI evaluation suite.
- Teacher pilot acceptance criteria.

## **18. Recommended implementation sequence**

This sequence preserves the original architecture and minimizes premature infrastructure work.

1. **Establish legal and provider eligibility**

   Confirm Ghana requirements, data-controller responsibilities, child consent, provider terms, and cross-border data processing.
2. **Finalize the shared contract**

   Stabilize `@devx/ai` request/result types, error handling, and mock-provider behavior.
3. **Implement the server-side provider interface**

   Keep it isolated from frontend packages and store credentials in Edge Function secrets.
4. **Complete the&#x20;**`education-ai`**&#x20;Edge Function**

   Implement authentication, authorization, validation, quotas, privacy controls, and provider approval.
5. **Implement quiz generation end-to-end**

   Use synthetic or approved lesson data. Require teacher review and approval.
6. **Implement evaluations and operational controls**

   Test correctness, safety, cost, latency, failure behavior, and usage limits.
7. **Pilot with controlled users**

   Start with a limited institution, controlled access, and appropriate consent.
8. **Expand carefully**

   Add lesson explanations, additional features, and durable background tasks only after evidence from the pilot.

## **19. Proposed changes to&#x20;**`ai-architecture.md`

Rather than restructuring the whole document, I recommend these additions to the existing file.

### **Add a section:&#x20;**`Ghana deployment and legal considerations`

Include:

- Ghana Data Protection Act, 2012 (Act 843).
- Data Protection Commission registration requirements.
- Data controller and processor responsibilities.
- Children’s data and guardian consent.
- User rights and privacy notice requirements.
- Cross-border processing.
- Hosting region considerations.
- Retention and deletion.
- Incident response and notification.
- Ghana-specific legal review requirements.

### **Expand&#x20;**`Privacy, security, and operations`

Add:

- Ghana-specific data protection considerations.
- Explicit data minimization for AI inference.
- Data-flow and subprocessor inventory.
- Retention periods by data category.
- Data-subject request handling.
- Guardian consent records.
- Breach response procedures.
- Privacy impact assessment.

### **Add&#x20;**`AI feature governance`

Include a feature registry:

```yaml
feature:
  id: quiz.generate
  owner: education
  purpose: teacher_quiz_draft_generation
  provider: pending_approval
  model: pending_approval
  data_categories:
    - lesson_content
  authorized_roles:
    - teacher
  output_schema: quiz_draft_v1
  review_required: true
  persistence: teacher_approved_only
  retention: defined_by_policy
  evaluation_suite: quiz_generate_v1
  risk_tier: low_to_medium
```

### **Expand&#x20;**`Decisions to settle before production`

Add the following:

- Which Ghanaian legal requirements apply to the platform and its customers?
- Who is the data controller for each deployment?
- What registration requirements apply under Act 843?
- What guardian consent workflow is required for under-18 learners?
- Which countries process learner data?
- Which AI providers are approved for educational data?
- What data can each feature send to the provider?
- What retention periods apply to AI inputs, outputs, logs, and tasks?
- How are user rights and deletion requests implemented?
- What breach notification and incident response procedures apply?
- What monthly spending limits apply to the pilot?
- What is the degraded behavior for each AI feature?
- What approval is required before an output is persisted or communicated?
- Which tools are allowed for future agents?

### **Add a section:&#x20;**`Production readiness checklist`

Make the document actionable by turning decisions into testable gates.

## **20. What I would deliberately not implement yet**

Some of the research recommendations are useful long-term but unnecessary for the current stage.

| Defer                                  | Why                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Multi-provider failover                | Adds complexity before reliability requirements are understood            |
| Multi-cloud deployment                 | Expensive operationally and unnecessary for an initial pilot              |
| Complex agent sandboxing               | No agent tools should be enabled in the initial pilot                     |
| AI governance platform                 | A version-controlled registry is sufficient initially                     |
| Advanced analytics on student AI usage | Privacy and product need should be established first                      |
| Full queue/worker platform             | Implement only when actual features require durable background processing |
| Automated AI decisions about students  | High-risk and unnecessary for the proposed initial features               |
| Ghana-local cloud infrastructure       | Not currently established as a legal requirement by the supplied research |
| Automatic model selection              | Keep provider/model choices explicit and auditable                        |

## **21. Important qualifications to the research**

The supplied research is valuable as a starting point, but several claims should be verified before being treated as legal or contractual requirements.

### **Ghana legal claims**

The following should receive review by Ghana-qualified counsel:

- Whether every school and/or DevX must register under the precise proposed deployment arrangement.
- The exact legal basis and requirements for guardian consent for all under-18 learners.
- Applicability of the Cybersecurity Act's 24-hour reporting provisions to DevX and each institutional customer.
- Applicable retention periods for education records.
- Requirements for data protection impact assessments.
- Any education-sector rules applicable to the specific schools and services.

### **International law references**

The industrial research discusses COPPA, FERPA, and GDPR. These should not automatically be treated as Ghanaian legal requirements.

They may become relevant if:

- Users are located in those jurisdictions.
- The platform serves institutions subject to those laws.
- Contracts require compliance.
- The provider's terms impose additional obligations.

The architecture should be jurisdiction-aware, but Ghana should be the primary legal baseline for the initial deployment.

### **Provider claims**

Provider privacy, retention, training, education eligibility, regional processing, and contractual terms change over time. These must be checked against the actual provider contracts and current documentation before approval.

## **22. Final recommendation**

The original `ai-architecture.md` is a good technical foundation. I would not replace it with a new architecture.

I would strengthen it in three areas:

### **Technical architecture**

Preserve the shared provider-neutral layer, Supabase Edge Functions, RLS, and bounded synchronous requests.

### **Governance**

Add feature ownership, provider approval, evaluations, cost controls, retention, and approval gates.

### **Ghana readiness**

Add DPC compliance, child protection, consent, cross-border disclosures, legal review, and incident response.

The immediate production target should be a **single approved AI provider, one narrowly scoped&#x20;**`education-ai`**&#x20;Edge Function, two bounded education features, no external agent tools, teacher review, minimal data exposure, and explicit cost and privacy controls**.

This is the most defensible balance between industrial practice, Ghana-specific requirements, the current DevX architecture, and the team's likely implementation capacity.

### **Source documents**

- Original architecture: `ai-architecture.md` —&#x20;

  ai-architecture.md

- Industrial approach research —&#x20;

  Provider & Account-Tier Selection

- Ghana-specific legal and regulatory research —&#x20;

  Ghana‐Specific Legal & Regulatory Adjustments

The legal and regulatory findings above are synthesized from the supplied research documents; they should not be treated as an independently verified legal opinion.
