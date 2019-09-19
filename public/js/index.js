const App = {};
App.server = 'http://localhost:3000';

App.lang = {
    'srv_xname_not_found': 'Your xname is not found. Please contact your tutor',
    'srv_invalid_uuid': 'Bad request',
    'srv_not_in_time': 'You cannot report your attendance now',
    'srv_already_registered': 'You have already reported your attendance today',
    'srv_success': 'Your attendance was sucessfully registered',
};

App.loadingCircle = $('<div class="lds-dual-ring"></div>');
App.doneNotification = $('<i class="material-icons notification success">check_circle</div>');
App.errorNotification = $('<i class="material-icons notification error">error</div>');

App.handleFinishAjax = (response) => {
    if (response) {
        if (response.xname) {
            localStorage.setItem('xname', response.xname);
        }
        const resp = response.responseJSON ? response.responseJSON : response;
        const alertType = resp.success ? 'success' : 'danger';
        const alertMsg = $(`<div class="alert alert-${alertType}" role="alert">${App.lang[resp.msg] || resp.msg}</div>`);
        App.alertPlaceholder.replaceWith(alertMsg);
        App.alertPlaceholder = alertMsg;
        if (response.responseJSON) {
            App.loadingCircle.before(App.attendanceForm);
            App.attendanceForm.find('button[type="submit"]').after(App.errorNotification);
            App.loadingCircle.detach();
        } else {
            App.loadingCircle.before(App.doneNotification);
            App.loadingCircle.detach();
            $('.card-header p').remove();
        }
    }
};

$(document).ready(() => {
    $('body').bootstrapMaterialDesign();
    const uuid = location.hash.slice(1);
    App.alertPlaceholder = $('#alert-placeholder');
    App.attendanceForm = $('#attendance-form');
    App.attendanceForm.find('[name="uuid"]').val(uuid);
    const xnameInput = App.attendanceForm.find('[name="xname"]');
    App.attendanceForm.submit((e) => {
        e.preventDefault();
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
    if (localStorage.getItem('xname')) {
        xnameInput.val(localStorage.getItem('xname'));
        xnameInput.prop('readonly', true);
        App.attendanceForm.submit();
    }
});