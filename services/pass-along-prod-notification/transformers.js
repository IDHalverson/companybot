
const convertBSCPDeployNotificationToText = (message) => {

    const frontEndDeployed = !!message.attachments[0].blocks.some(block => blockHasText(block, "main.bundle.js")) ? "Yes" : "No";
    const backEndDeployed = !!message.attachments[0].blocks.some(block => blockHasText(block, "scp-rest-api.war")) ? "Yes" : "No";
    const integrationDeployed = !!message.attachments[0].blocks.some(block => blockHasText(block, "scp-integration.war")) ? "Yes" : "No";


    return {
        username: "BSCP Deploy Script",
        icon_emoji: ":rocket_rising:",
        blocks: undefined,
        text: `${process.env.BSCP_APP_NAME} was deployed to Production. \nFront-End: \`${frontEndDeployed
            }\` \nBack-End: \`${backEndDeployed}\` \nIntegration: \`${integrationDeployed}\``
    }
}

// const aTransformerTemplate = async (message, allTextFound, axios) => {
//     const aLink = (allTextFound.match(new RegExp(process.env.LINK_REGEX)) || [])[0]
//     const response = await axios.get(aLink);
//     return {};
// }

module.exports = { convertBSCPDeployNotificationToText }