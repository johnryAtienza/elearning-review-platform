/**
 * Static copy for the public /about ("Who we are") page.
 *
 * For v1 this is hardcoded per the wireframe — admin editing of these
 * sections is NOT in scope for Phase A. When/if we move this to a DB-backed
 * editor, the shape below is what the page expects.
 *
 * Update the strings here, then commit; the page will re-render automatically.
 */

export interface AboutSection {
  heading: string
  /** Plain text. Newlines render as paragraph breaks. */
  body: string
}

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: 'Who are we',
    body:
      'S Class Review is a focused board exam review program for Filipino ' +
      'mechanical engineering candidates. We pair printed reviewer books with ' +
      'an always-on online platform — daily problem solutions, weekly drills, ' +
      'and topnotcher-led catch-up sessions — so reviewers can keep momentum ' +
      'whether they study at home, on a commute, or between work shifts.',
  },
  {
    heading: 'Review philosophy',
    body:
      'Pass rates rise when reviewers practise consistently, not heroically. ' +
      'Our daily MC drills, weekly mock exams, and worked solutions are designed ' +
      'around small reps that compound — six days a week, every week, until ' +
      'the board exam.',
  },
  {
    heading: 'Mission',
    body:
      'To give every Filipino mechanical engineering board candidate the ' +
      'structured practice, reliable explanations, and topnotcher mentorship ' +
      'they need to walk into the exam confident.',
  },
  {
    heading: 'Vision',
    body:
      'A generation of Filipino mechanical engineers who pass the boards on ' +
      'their first attempt — not because they got lucky, but because they ' +
      'were prepared.',
  },
]
