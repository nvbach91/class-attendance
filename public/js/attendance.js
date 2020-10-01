const App = {};
App.server = '';

App.doneNotification = $('<i class="fas fa-check-circle"></i>');
App.errorNotification = $('<i class="fas fa-exclamation-circle"></i>');

App.lang = {
    'srv_xname_not_found': `<span>Your xname is not found. Please contact your tutor</span>${App.errorNotification[0].outerHTML}`,
    'srv_invalid_uuid': `<span>Bad request</span>${App.errorNotification[0].outerHTML}`,
    'srv_not_in_time': `<span>You cannot report your attendance now</span>${App.errorNotification[0].outerHTML}`,
    'srv_already_registered': `<span>You have already reported your attendance today</span>${App.errorNotification[0].outerHTML}`,
    'srv_success': `<span>Your attendance was sucessfully registered</span>${App.doneNotification[0].outerHTML}`,
};

App.loadingCircle = $('<div class="lds-dual-ring"></div>');
App.getSmile = (points) => {
    switch (+points) {
        case 15:
            return 'fas fa-heart-broken';
        case 14:
            return 'fas fa-heart';
        case 13:
            return 'far fa-kiss-wink-heart';
        case 12:
            return 'far fa-kiss-beam';
        case 11:
            return 'far fa-laugh-wink';
        case 10:
            return 'far fa-grin-hearts';
        case 9:
            return 'far fa-laugh-beam';
        case 8:
            return 'far fa-grin-squint-tears';
        case 7:
            return 'far fa-grin-squint';
        case 6:
            return 'far fa-smile-beam';
        case 5:
            return 'far fa-smile-wink';
        case 4:
            return 'far fa-smile';
        case 3:
            return 'far fa-grin';
        case 2:
            return 'far fa-grin-beam-sweat';
        case 1:
            return 'far fa-poop';
        case 0:
            return 'far fa-poop';
    }
}


App.handleFinishAjax = (response) => {
    const resp = response.responseJSON ? response.responseJSON : response;
    const alertType = resp.success ? 'success' : 'danger';
    const alertMsg = $(`<div class="alert alert-${alertType} server-message" role="alert">${App.lang[resp.msg] || resp.msg}</div>`);
    App.alertPlaceholder.replaceWith(alertMsg);
    App.alertPlaceholder = alertMsg;
    if (response.readyState === 0 || response.responseJSON) {
        App.loadingCircle.before(App.attendanceForm);
        App.attendanceForm.find('button[type="submit"]').after(App.errorNotification);
        App.loadingCircle.detach();
    } else {
        if (response.xname) {
            localStorage.setItem('xname', response.xname);
            App.forgetXnameButton.hide();
        }
        App.loadingCircle.before(`
            <div class="alert alert-success result" role="alert">
                <div class="student-info">
                    <div class="student-avatar"><i class="${App.getSmile(response.semesterPoints)}"></i></div>
                    <div class="student-xname">${response.xname}</div>
                    <div class="student-name"><strong>${response.name}</strong></div>
                </div>
                <div class="student-assessment">
                    <div class="sa-row">
                        <div class="sa-col">Activity points</div>
                        <div class="sa-col"><strong>${response.semesterPoints}</strong></div>
                    </div>
                    <div class="sa-row">
                        <div class="sa-col">Project 1</div>
                        <div class="sa-col"><strong>${response.sp1Points || 'N/A'}</strong></div>
                    </div>
                    <div class="sa-row">
                        <div class="sa-col">Project 2</div>
                        <div class="sa-col"><strong>${response.sp2Points || 'N/A'}</strong></div>
                    </div>
                </div>
            </div>`);
        App.loadingCircle.detach();
        $('.card-header p').remove();
    }
    if (resp.msg === 'srv_xname_not_found') {
        App.forgetXnameButton.show();
    }
};

$(document).ready(() => {
    $('body').bootstrapMaterialDesign();
    const uuid = location.hash.slice(1);
    App.alertPlaceholder = $('#alert-placeholder');
    App.attendanceForm = $('#attendance-form');
    App.forgetXnameButton = $('#forget-xname');
    if (!/[a-z0-9]{6}/.test(uuid)) {
        return App.attendanceForm.replaceWith(`<div class="alert alert-danger" role="alert">Oops! Looks live you have the wrong link. Please click <a href="/link">here</a></div>`)
    }
    App.attendanceForm.find('[name="uuid"]').val(uuid);
    const xnameInput = App.attendanceForm.find('[name="xname"]');
    App.attendanceForm.submit((e) => {
        e.preventDefault();
        App.alertPlaceholder.empty();
        App.errorNotification.detach();
        App.attendanceForm.before(App.loadingCircle);
        App.attendanceForm.detach();
        $.ajax({
            type: 'POST',
            url: `${App.server}/attend`,
            data: App.attendanceForm.serialize().replace(/\s+/g, ''),
            dataType: 'json',
        }).done(App.handleFinishAjax).fail(App.handleFinishAjax);
    });
    App.forgetXnameButton.click(() => {
        xnameInput.val('').prop('readonly', false);
        localStorage.removeItem('xname');
    });
    if (localStorage.getItem('xname')) {
        xnameInput.val(localStorage.getItem('xname'));
        xnameInput.prop('readonly', true);
        App.attendanceForm.submit();
    }
});