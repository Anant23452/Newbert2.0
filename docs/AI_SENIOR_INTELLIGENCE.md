# AI-03.2 Senior Intelligence

AI-03.2 compares a student's current evidence with structured, submitted alumni evidence. It is deterministic and does not use Gemini to invent preparation history, scores, phases, or advice.

## Alumni Paths

`careerPaths` contains `placement`, `gate`, or both. Legacy `path` and `outcomeType` remain supported during migration.

Placement records use `placementOutcome` and `placementPreparation`. Preparation may contain DSA totals and difficulty counts, development skills/projects, CS fundamentals, interview practice, internships, contests, and ordered `preparationPhases`.

GATE records use `gateOutcome` and `gatePreparation`. Preparation may contain subject strength, revision count, practice count, test series, mocks, PYQ coverage, revision strategy, and ordered `preparationPhases`.

Missing fields have no numeric default and display as unavailable.

## Placement Comparison

Available factors are reweighted rather than treating missing factors as zero:

| Factor | Weight |
| --- | ---: |
| Same college | 15 |
| Same branch | 15 |
| Same target role | 15 |
| Development skill overlap | 25 |
| DSA count similarity | 15 |
| Project count similarity | 15 |

Skill coverage is `shared alumni skills / submitted alumni skills`. Numeric similarity is `100 - absolute difference / larger value * 60`, bounded to 0-100. Percentages are shown only for these defined formulas; other dimensions show raw values.

## GATE Comparison

| Factor | Weight |
| --- | ---: |
| Same college | 15 |
| Same branch | 15 |
| Same paper | 15 |
| Subject overlap | 25 |
| Preparation duration similarity | 10 |
| Test-practice similarity | 20 |

Student GATE evidence currently comes from the AI-03 understood stage. If mocks, PYQs, revision cycles, or duration were not recorded there, they remain unavailable.

## Similarity And Confidence

Similarity bands: at least three comparable factors are required. `very_similar` is 80+, `similar` is 60-79, `somewhat_similar` is 35-59, and all lower or insufficient comparisons are `limited_comparison`.

Confidence is based on comparable displayed dimensions: high for 5+, medium for 3-4, and low below 3. Differences are generated only from two available stored values or submitted skill/subject lists.

## Roadmap Evidence

"Use this path in my roadmap" stores a bounded `alumniSignals` entry on the student's existing Plan. On recalculation, supported comparison dimensions are attached as `alumni_path` evidence to relevant AI-03 tasks. It does not copy alumni phases, change the AI-03 priority formula, or guarantee the same outcome.

## Privacy And Limitations

Alumni data is sanitized before matching, comparison, benchmarking, or roadmap evidence. Hidden preparation cannot be inferred through a difference statement. Current limitations include no alumni self-service editor, no document verification workflow, and limited student-side GATE fields outside the roadmap stage.

