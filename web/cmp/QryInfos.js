const QryInfos = {
    rowsAffected: "",
    duration: "",
    truncated: false,
    clockResolution: null,
    oninit: () => {
        return m.request({
            method: "GET",
            url: "/api/clockresolution"
        })
        .then(function (result) {
            QryInfos.clockResolution = Math.ceil(result.data/1e+6) + " ms"; // nanoseconds to milliseconds
        })
    },
    reset: () => {
        QryInfos.rowsAffected = "";
        QryInfos.duration = "";
        QryInfos.truncated = false;
    },
    view: () => {
        QryInfos.rowsAffected = !QryForm.resp ? "" : QryForm.resp.rowsAffected;
        QryInfos.duration = !QryForm.resp ? "" : (QryForm.resp.duration == 0 ? "<" + QryInfos.clockResolution : QryForm.resp.duration) + " ms";
        QryInfos.truncated = !QryForm.resp ? false : QryForm.resp.truncated;
        return [ 
            !QryInfos.duration ? null : [
                m("div.tab-addon.font-sm.mr-20", {style: "min-width: 130px; "}, "rows affected: ", 
                    m('span.info', {
                        class: QryInfos.truncated ? "text-warning" : "",
                        title: QryInfos.truncated ? "The result is truncated. Use export to get the full result." : "",
                    }, QryInfos.rowsAffected + (QryInfos.truncated ? "+" : ""))
                ),
                m("div.tab-addon.font-sm.mr-20", "duration: ", m("span.info", QryInfos.duration)),
            ]
        ];
    }
};