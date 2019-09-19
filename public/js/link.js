
$(document).ready(function () {
    $('body').bootstrapMaterialDesign();
    let allowedTime = 18000000;
    let validTimes = {};
    $.when(
        $.getJSON('/allowed-time').done((resp) => allowedTime = resp),
        $.getJSON('/valid-times').done((resp) => {
            validTimes = resp;
        })
    ).then(() => {
        const qrCodeContainer = $('#qrcode');
        const qrcode = new QRCode('qrcode');
        const uuids = Object.keys(validTimes);
        const now = new Date('2019-09-20T09:00:00Z');
        let uuid = '';
        for (let i = 0; i < uuids.length; i++) {
            uuid = uuids[i];
            const startTime = new Date(validTimes[uuid].date);
            if (now.getTime() > startTime.getTime() - 600000 && now.getTime() < startTime.getTime() + allowedTime) {
                break;
            } else {
                uuid = '';
            }
        }
        if (uuid) {
            const url = `${location.origin}/attendance/#${uuid}`;
            qrcode.makeCode(url);
            qrCodeContainer.after(`
                <hr>
                <a href=${url}>${url}</a>
                <hr>
                <div class="d-flex justify-content-between">
                    <strong>T${validTimes[uuid].column}</strong>
                    <strong>${new Date(validTimes[uuid].date).toLocaleDateString('cs')}</strong>
                </div>`
            );
        } else {
            qrCodeContainer.before(`<div class="alert alert-danger" role="alert">There is no active attendance session</div>`)
        }
    });
});