const Enum = require("../config/Enum");
const CustomError = require("./Error");
const config = require("../config");
const I18n = require("./i18n");              // ÖNEMLİ: ./i18n
const i18n = new I18n(config.DEFAULT_LANG);  // Artık constructor çalışır

class Response {
    constructor() {}

    static successResponse(data, code = 200) {
        return {
            code,
            data
        }
    }

    static errorResponse(error, lang) {
        if (error instanceof CustomError) {
            return {
                code: error.code,
                error: {
                    message: error.message,
                    description: error.description
                }
            }
        } else if (error?.message?.includes("E11000")) {
            return {
                code: Enum.HTTP_CODES.CONFLICT,
                error: {
                    message: i18n.translate("COMMON.ALREADY_EXIST", lang),
                    description: i18n.translate("COMMON.ALREADY_EXIST", lang)
                }
            }
        }

        return {
            code: Enum.HTTP_CODES.INT_SERVER_ERROR,
            error: {
                message: i18n.translate("COMMON.UNKOWN_ERROR", lang),
                description: error?.message
            }
        }
    }
}

module.exports = Response;
