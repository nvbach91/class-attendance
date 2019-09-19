
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
        const now = new Date();
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
                <a class="attendance-url" href=${url}>${url}</a>
                <hr>
                <div class="d-flex justify-content-between">
                    <strong>Week ${validTimes[uuid].column}</strong>
                    <strong>${new Date(validTimes[uuid].date).toLocaleDateString('cs')}</strong>
                </div>`
            );
        } else {
            qrCodeContainer.before(`<div class="alert alert-danger" role="alert">There is no active attendance session</div>`)
        }
        
        var weeks = Object.values(validTimes);
        weeks.sort((a, b) => a.column - b.column);
        $('#main').append(`
            <br>
            <div class="card">
                <div class="card-header">Upcoming classes</div>
                <div class="card-body">
                ${weeks.map((week) => { 
                    return `
                        <button class="upcoming-class btn btn-primary ${now > new Date(week.date) ? 'text-muted' : 'font-weight-bold'}">
                            <span>Week ${week.column}</span>
                            <span>${new Date(week.date).toLocaleDateString('cs')}</span>
                        </button>
                    `;
                }).join('')}
                </div>
            </div>
        `)
    });
});