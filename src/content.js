/**
 * All the words on the site live here.
 * PLACEHOLDER: swap this copy for your real bio, projects, and links.
 */
/** Plain-text versions rendered onto in-scene surfaces (laptop screen, letter, bio card). */
export const SURFACES = {
  projects: {
    title: "Things I've built",
    items: [
      ["Project One", "A one-line description of what it does and why it's neat."],
      ["Project Two", "Another placeholder. Link it to a repo or live demo."],
      ["Project Three", "The third slot. Three is a nice number."],
    ],
  },
  contact: {
    title: "Say hello",
    lines: [
      ["Email", "johndangca@gmail.com"],
      ["GitHub", "github.com/your-handle"],
      ["LinkedIn", "linkedin.com/in/your-handle"],
    ],
  },
  about: {
    title: "Hey, I'm John",
    lines: [
      "Placeholder bio — I build warm, playful",
      "things for the web, and I apparently like",
      "owls enough to keep several in my room.",
      "",
      "Swap this copy in src/content.js when",
      "the real words are ready.",
    ],
  },
  owl: "Hoo! I'm Ollie.",
  style: {
    title: "The rack",
    lines: [
      "Avant-garde fashion is the other hobby:",
      "draped silhouettes, sculptural layers,",
      "and boots that confuse my relatives.",
      "",
      "Placeholder — name your actual grails",
      "and designers in src/content.js.",
    ],
  },
};

export const CONTENT = {
  about: {
    eyebrow: "The person behind the desk",
    title: "Hey, I'm John",
    body: `
      <div class="placeholder-box">📷 &nbsp;Your photo goes here — drop it in <code>/public/images/</code> and update <code>src/content.js</code></div>
      <p>This is placeholder bio text. I'm John Dang — I like building warm, playful
      things for the web, and apparently I like owls enough to put several in my room.</p>
      <p>Write a couple of sentences here about where you're from, what you do, and
      what you're looking for. Keep it human — this room is doing the charm work,
      the words just need to be you.</p>
    `,
  },
  projects: {
    eyebrow: "On the workbench",
    title: "Things I've built",
    body: `
      <p>Placeholder project list — swap these for the real ones.</p>
      <ul>
        <li><strong>Project One</strong><span>A one-line description of what it does and why it's neat.</span></li>
        <li><strong>Project Two</strong><span>Another placeholder. Link it to a repo or live demo.</span></li>
        <li><strong>Project Three</strong><span>The third slot. Three is a nice number.</span></li>
      </ul>
    `,
  },
  contact: {
    eyebrow: "Send a letter",
    title: "Say hello",
    body: `
      <p>The owl accepts all correspondence on my behalf.</p>
      <ul>
        <li><strong>Email</strong><span><a href="mailto:johndangca@gmail.com">johndangca@gmail.com</a></span></li>
        <li><strong>GitHub</strong><span><a href="#" rel="noopener">github.com/your-handle — placeholder</a></span></li>
        <li><strong>LinkedIn</strong><span><a href="#" rel="noopener">linkedin.com/in/your-handle — placeholder</a></span></li>
      </ul>
    `,
  },
  owl: {
    eyebrow: "Resident",
    title: "This is Ollie",
    body: `
      <p>Ollie supervises everything that happens in this room. He has never once
      blinked at an appropriate moment and he is not going to start now.</p>
      <p>PLACEHOLDER: put a fun fact about yourself here — the kind of thing you'd
      mention at minute forty of a good conversation.</p>
    `,
  },
  radio: {
    eyebrow: "Now playing",
    title: "The old radio",
    body: `
      <p>It only picks up one station: a slow, warm little tune that lives inside
      this website. Click the radio again (or the note icon, top right) to turn it off.</p>
      <p>PLACEHOLDER: when you have a real track, drop an mp3 in <code>/public/audio/</code>
      and swap the generated ambience in <code>src/audio.js</code>.</p>
    `,
  },
};
