export default {
  async fetch() {
    return new Response(
      `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>BeadFable — Turn Photos into Beadable Art</title>
          <meta
            name="description"
            content="Turn your favorite photos into beautiful fuse bead patterns."
          />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              font-family: Arial, Helvetica, sans-serif;
              background: #fff8f1;
              color: #2b1d16;
            }
            .wrap {
              width: min(1120px, calc(100% - 40px));
              margin: 0 auto;
            }
            header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 24px 0;
            }
            .brand {
              font-size: 24px;
              font-weight: 800;
              letter-spacing: -0.8px;
            }
            .badge {
              display: inline-block;
              margin-left: 8px;
              padding: 5px 9px;
              border-radius: 999px;
              background: #f4dfce;
              font-size: 12px;
              font-weight: 700;
            }
            main {
              display: grid;
              grid-template-columns: 1.1fr 0.9fr;
              gap: 48px;
              align-items: center;
              padding: 76px 0 84px;
            }
            h1 {
              margin: 0;
              font-size: clamp(44px, 6vw, 76px);
              line-height: 0.98;
              letter-spacing: -3px;
            }
            .lead {
              max-width: 570px;
              margin: 24px 0 30px;
              font-size: 20px;
              line-height: 1.6;
              color: #694f42;
            }
            .button {
              display: inline-block;
              padding: 15px 22px;
              border-radius: 12px;
              background: #e35d3d;
              color: white;
              font-weight: 800;
              text-decoration: none;
              box-shadow: 0 8px 0 #b9452c;
            }
            .button:active {
              transform: translateY(4px);
              box-shadow: 0 4px 0 #b9452c;
            }
            .note {
              margin-top: 18px;
              font-size: 14px;
              color: #8a6c5c;
            }
            .art {
              padding: 34px;
              border-radius: 28px;
              background: #2b1d16;
              box-shadow: 0 24px 60px rgba(84, 49, 31, 0.22);
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(8, 1fr);
              gap: 8px;
            }
            .bead {
              aspect-ratio: 1;
              border-radius: 50%;
              box-shadow: inset 0 -5px 0 rgba(0,0,0,.12), inset 0 4px 0 rgba(255,255,255,.25);
            }
            .b1 { background:#f7c948; }
            .b2 { background:#e35d3d; }
            .b3 { background:#8abf88; }
            .b4 { background:#6b8fd6; }
            .b5 { background:#f4dfce; }
            .b6 { background:#f39ac2; }
            .b7 { background:#ffffff; }
            footer {
              padding: 28px 0 36px;
              border-top: 1px solid #efdccc;
              font-size: 14px;
              color: #806557;
            }
            @media (max-width: 760px) {
              main {
                grid-template-columns: 1fr;
                padding: 46px 0 60px;
              }
              .art {
                max-width: 520px;
              }
              h1 {
                letter-spacing: -2px;
              }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <header>
              <div class="brand">BeadFable <span class="badge">Coming Soon</span></div>
            </header>

            <main>
              <section>
                <h1>Turn photos into beadable art.</h1>
                <p class="lead">
                  BeadFable helps you turn a favorite photo into a beautiful,
                  printable fuse bead pattern — complete with color guidance
                  and a ready-to-make design.
                </p>
                <a class="button" href="mailto:hello@beadfable.com?subject=BeadFable%20Early%20Access">
                  Join Early Access
                </a>
                <div class="note">Your first custom bead pattern is coming soon.</div>
              </section>

              <section class="art" aria-label="Colorful fuse bead pattern preview">
                <div class="grid">
                  <i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i>
                  <i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i><i class="bead b2"></i>
                  <i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i>
                  <i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i>
                  <i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i>
                  <i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i>
                  <i class="bead b7"></i><i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i>
                  <i class="bead b1"></i><i class="bead b2"></i><i class="bead b3"></i><i class="bead b4"></i><i class="bead b5"></i><i class="bead b6"></i><i class="bead b7"></i><i class="bead b1"></i>
                </div>
              </section>
            </main>

            <footer>
              © 2026 BeadFable · Made for colorful ideas.
            </footer>
          </div>
        </body>
      </html>`,
      {
        headers: {
          "content-type": "text/html; charset=UTF-8"
        }
      }
    );
  }
};
