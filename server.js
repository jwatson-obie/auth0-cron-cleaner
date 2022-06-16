require("dotenv").config();
const cron = require("node-cron");
const ManagementClient = require("auth0").ManagementClient;

console.log("auth0-cron-cleaner running...");

cron.schedule("0 */1 * * *", () => {
  console.log("running a task every minute");
  try {
    cleanup();
  } catch (err) {
    console.log("Something bad about to happen");
    console.log(err);
  }
});

const cleanup = () => {
  const MAX_USER_QUERY = 100;
  const MAX_PAGE_NUM = 9;
  const stringToCheckForDeletion = "pongo";

  let managementClient;
  let pageCount;
  let totalUserCount;
  let numPages;

  (async () => {
    await beginningMessage();

    if (process.env.AUTH0_DOMAIN !== "obiecre-dev.auth0.com") {
      console.log(
        "Looks like your env vars aren't quite right.",
        "Be sure your auth0 env variables are set up to connect to obiecre-dev",
        "\nEnding now..\n",
        "**********"
      );
      return;
    }

    setupClient();

    await logTotalUsers();

    await deletePongoUsers();

    await logEndingMessage();
  })();

  async function deletePongoUsers() {
    numPages = Math.min(
      Math.ceil(totalUserCount / MAX_USER_QUERY),
      MAX_PAGE_NUM
    );

    for (
      let currentPageNumber = 1;
      currentPageNumber <= numPages;
      currentPageNumber++
    ) {
      const usersList = await managementClient.getUsers({
        per_page: MAX_USER_QUERY,
        page: currentPageNumber,
      });

      for (const user of usersList) {
        const hasPongoName =
          user.name.toLowerCase().indexOf(stringToCheckForDeletion) >= 0;
        const hasPongoEmail =
          user.email.toLowerCase().indexOf(stringToCheckForDeletion) >= 0;

        if (hasPongoEmail || hasPongoName) {
          if (user.name !== "Pongo Rule") {
            console.log(`Deleting: ${user.name}..`);
          }

          await managementClient.deleteUser({
            id: user.user_id,
          });
        } else {
          console.log(`Not deleting: ${user.name}..`);
        }
      }
    }
  }

  function setupClient() {
    managementClient = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
    });
  }

  async function beginningMessage() {
    console.log("\n\n\n");
    console.log("**********");
    await logAndPause(
      `This file will delete potentially many users in the Auth0 domain named '${process.env.AUTH0_DOMAIN}'.`
    );
    await logAndPause(
      `Any client containing "${stringToCheckForDeletion}" either in the name, or email, will be deleted.`
    );
    await logAndPause("Starting in...");
    await logAndPause("...3...");
    await logAndPause("...2...");
    await logAndPause("...1...");
    console.log("Starting the purge...");
    console.log("**********");
    console.log("\n\n\n");
  }

  function logAndPause(msg) {
    console.log(msg);
    return pause();
  }

  function pause() {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  async function logTotalUsers() {
    totalUserCount = await managementClient.getActiveUsersCount();
    console.log("Total user count on this tenant: ", totalUserCount);
  }

  async function logEndingMessage() {
    await logTotalUsers();
    console.log("\n\n\nDone!\n\n\n");
  }
};

// cleanup();
