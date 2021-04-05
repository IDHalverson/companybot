module.exports = {
    REPLACE_TAG_WAIT_TIME: 4000,
    SPACE_TRIM_MAX_ITERATIONS: 10,
    // ^^^ Must be greater than SPACE_TRIM_INCREMENT_DOWN_FROM_THIS_FIRST
    SPACE_TRIM_INCREMENT_DOWN_FROM_THIS_FIRST: 3,
    BOT_EMOJI: ":tag:",
    BOT_NAME: "Tag Helper",
    DOUBLE_AT_BOT_EMOJI: ":point_right:",
    DOUBLE_AT_BOT_NAME: "Smart Tags",
    FEATURE_FLAGS: {
        usedDoubleAts: {
            [true]: {
                tagMultipleMatchedUsersWithOneTag: true
            }
        }
    }
}