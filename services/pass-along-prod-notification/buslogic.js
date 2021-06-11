const { app } = require("../../index");

const blockHasText = (block, text) => block.text && (typeof block.text === "string" && block.text.includes(text) ||
    typeof (block.text && block.text.text) === "string" && block.text.text.includes(text))

const ifConfiguredPassAlongMessage = async ({ message, payload, context, }) => {

    const configurations = (process.env.PROD_PASSALONG_CONFIGURATIONS || "").split("<nextpassalongconfig/>");

    configurations.forEach(configuration => {
        const [appId, searchFor, sendTo] = configuration.split("<<<<,>>>>");

        if (message.bot_profile && message.bot_profile.app_id === appId) {

            if (message.attachments && message.attachments[0] && message.attachments[0].blocks && message.attachments[0].blocks.some(block =>
                blockHasText(block, searchFor)
            )) {

                const frontEndDeployed = !!message.attachments[0].blocks.some(block => blockHasText(block, "main.bundle.js")) ? "Yes" : "No";
                const backEndDeployed = !!message.attachments[0].blocks.some(block => blockHasText(block, "scp-rest-api.war")) ? "Yes" : "No";
                const integrationDeployed = !!message.attachments[0].blocks.some(block => blockHasText(block, "scp-integration.war")) ? "Yes" : "No";

                app.client.chat.postMessage({
                    token: context.botToken,
                    channel: sendTo,
                    text: "",
                    icon_emoji: ":rocket_rising:",
                    username: "BSCP Deploy Script",
                    text: `Burris Supply Chain Portal was deployed to Production. \nFront-End: \`${frontEndDeployed}\` \nBack-End: \`${backEndDeployed}\` \nIntegration: \`${integrationDeployed}\``
                })
            }
        }

    })
}

module.exports = { ifConfiguredPassAlongMessage }