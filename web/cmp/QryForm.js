const QryForm = {
    query: "",
    resp: null,
    exportType: "",
    statementType: "",
    resizeObserver: null,
    editor: null,
    editorTheme: "",
    xhr: null,
    executing: false,
    callError: false,
    reset: () => {
        QryForm.query = "";
        QryForm.resp = null;
        QryForm.currentPage = 0;

        QryExplain.reset();
        QryInfos.reset();
    },
    // execute query and explain query forms
    submitQuery: () => {
        QryForm.resp = null;
        QryForm.currentPage = 0;
        QryForm.query = QryForm.editor.getCode().trim();
        ConnForm.saveToLocalStorage('lastQuery', QryForm.query);
        if (!QryForm.query.length) {
            return;
        }
        QryForm.executing = true;
        var formData = new FormData();
        formData.set("conn", App.conn);
        formData.set("schema", App.schema);
        formData.set("query", QryForm.query);
        formData.set("statementType", QryForm.statementType);

        m.request({
            method: "POST",
            url: "/api/query",
            headers: getRequestHeaders(),
            extract: getRequestExtract(),
            config: function (xhr) {
                QryForm.xhr = xhr;
            },
            body: formData,
        }).then((response) => {
            QryForm.executing = false;
            QryForm.callError = null;
            QryResult.currentPage = 0;
            QryForm.resp = response;
            QryForm.resp.duration = Math.ceil(QryForm.resp.duration / 1e+6); // nanoseconds to milliseconds
        }).catch((e) => {
            QryForm.executing = false;
            QryForm.callError = e.code ? e.code + ": " + e.message : "no error message. The server did not respond.";
        });
    },

    // download results form: see view

    view: () => {
        return ConnForm.DBerror !== "" ? m('code.text-warning', ConnForm.DBerror) :
            !App.conn.length ? null :
                [
                    m("code[id=query-code]", {
                        onclick: () => {
                            QryForm.editor.setFocusInitial();
                        },
                        oninit: (vnode) => {
                            var qryFormMenuHeight = 58; // #qryFormMenu height
                            var datadictMgBtm = 2;
                            QryForm.resizeObserver = new ResizeObserver(entries => {
                                vnode.dom.style.height = entries[0].contentRect.height - qryFormMenuHeight + 'px';

                                // adjust height of area-q-datadict 1st child 
                                document.querySelector('section.area-q-datadict > :first-child').style.height = entries[0].contentRect.height - datadictMgBtm + 'px';
                            });
                        },
                        oncreate: (vnode) => {
                            QryForm.editorTheme = App.theme;
                            QryForm.editor = new SqlEditor(vnode.dom.id, isLightTheme(App.theme) ? 'light' : 'dark');
                            QryForm.editor.setCode(ConnForm.getFromLocalStorage('lastQuery') || '');
                            QryForm.editor.setFocusInitial();
                            
                            // Start observing the element
                            QryForm.resizeObserver.observe(document.querySelector('.area-query-editor'));
                        },
                        onbeforeupdate: () => {
                            if (QryForm.editorTheme !== App.theme) {
                                if (isLightTheme(App.theme)) QryForm.editor.setLightTheme();
                                else QryForm.editor.setDarkTheme();
                                QryForm.editorTheme = App.theme;
                            }
                            return false;
                        },
                        onremove: () => {
                            QryForm.resizeObserver.disconnect();
                        }
                    }),
                    m("div[id=qryFormMenu]", { style: "padding: 0 6px;" },
                        m("fieldset",
                            m("legend", "download results"),
                            /* it uses a classic form to permit file download */
                            m("form", {
                                method: "POST",
                                action: "/api/export",
                                target: "exportPopup",
                                onsubmit: (e) => {
                                    //QryForm.disableSubmit = true;
                                    let query = QryForm.editor.getCode();
                                    e.target.elements["query"].value = query;
                                    if (query.trim() === "") return false;
                                    // open a popup window for the form's target
                                    let popup = window.open('', 'exportPopup', 'width=600,height=400');
                                    let content = '<html><head><title>Export in progress</title><meta name="color-scheme" content="light dark"></head>'
                                        + '<body><h2>Processing your export...</h2><button type=button onclick=window.close()>Close</button></body></html>';
                                    popup.document.write(content);
                                    popup.onload = () => { popup.close(); }; // may not work
                                    return true; // let the browser continue form submission
                                }
                            },
                                m("select[name=exportType][required]", { title: "choose file format to export to" },
                                    m("option", { value: "csv" }, ".csv file"),
                                    m("option", { value: "xlsx" }, ".xlsx file"),
                                ),
                                m('input[name=conn][type="hidden"]', { value: App.conn }),
                                m('input[name=schema][type="hidden"]', { value: App.schema }),
                                m('input[name=query][type="hidden"]'),
                                m("button[type=submit].ml-10", {
                                    title: "execute query and download results",
                                    disabled: QryForm.executing,
                                }, "download"),
                            ),
                        ),
                        m("div", { style: "float: right;" },
                            m("fieldset.ml-20",
                                m("legend", "explain query"),
                                m("button[type=button]", {
                                    disabled: QryForm.executing,
                                    onclick: () => {
                                        QryExplain.submit();
                                        App.tabState.set("explain");
                                    }
                                }, "explain"),
                            ),
                            m("fieldset.ml-20",
                                m("legend", "execute query"),
                                m("select[name=statementType]", {
                                    title: "'auto' || 'query' to return rows || 'exec' to return number of affected rows",
                                    onchange: (e) => { QryForm.statementType = e.target.value }
                                },
                                    m("option", { value: "auto" }, "auto"),
                                    m("option", { value: "query" }, "query"),
                                    m("option", { value: "exec" }, "exec"),
                                ),
                                m("button[type=button].ml-10", {
                                    disabled: QryForm.executing,
                                    onclick: () => {
                                        QryForm.submitQuery();
                                        App.tabState.set("result");
                                    }
                                }, "execute"),
                                m("button[type=button]", {
                                    title: "abort execution",
                                    disabled: !QryForm.executing,
                                    onclick: () => {
                                        QryForm.xhr.abort();
                                        QryForm.xhr = null;
                                        QryForm.executing = false;
                                    }
                                }, "■"),
                            ),
                        )

                    ),
                ];
    }
}