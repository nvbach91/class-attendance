const App = {};
App.server = '';

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
    const alertMsg = $(`<div class="alert alert-${alertType}" role="alert">${App.lang[resp.msg] || resp.msg}</div>`);
    App.alertPlaceholder.replaceWith(alertMsg);
    App.alertPlaceholder = alertMsg;
    if (response.readyState === 0 || response.responseJSON) {
        App.loadingCircle.before(App.attendanceForm);
        App.attendanceForm.find('button[type="submit"]').after(App.errorNotification);
        App.loadingCircle.detach();
    } else {
        if (response.xname) {
            localStorage.setItem('xname', response.xname);
        }
        App.loadingCircle.before(App.doneNotification);
        App.loadingCircle.before(`
            <div class="alert alert-success" role="alert">
                <strong>${response.xname}</strong>
                <br>
                <strong>${response.name}</strong>
                <br>
                Points: <strong>${response.points}</strong> 
                <br>
                <i class="${App.getSmile(response.points)}"></i>
            </div>`);
        App.loadingCircle.detach();
        $('.card-header p').remove();
    }
};

$(document).ready(() => {
    $('body').bootstrapMaterialDesign();
    const uuid = location.hash.slice(1);
    App.alertPlaceholder = $('#alert-placeholder');
    App.attendanceForm = $('#attendance-form');
    if (!/[a-z0-9]{6}/.test(uuid)) {
        return App.attendanceForm.replaceWith(`<div class="alert alert-danger" role="alert">Oops! Looks live you have the wrong link. Please click <a href="/link">here</a></div>`)
    }
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