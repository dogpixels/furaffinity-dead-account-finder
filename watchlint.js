var list_selector = `.section-body.watch-list`;
var links_selector = '.watch-list-items';

var regex = {
	name: /title>Userpage of ([\w-]+)/gm,
	last_submission_age: {
		regex: /uploaded.*title="([^"]+)"/gm,
		result: 'MMM DD, YYYY hh:mm A'
	},
	no_submissions: /This\suser\shas\sno\ssubmissions/gm,
	disabled: /has\svoluntarily\sdisabled\saccess|deactivated\sby\sthe\sowner/gm
}


var list = document.querySelector(list_selector);

if (typeof list !== 'undefined') {
	let scan_all_button = document.createElement('button');
	scan_all_button.type = 'button';
	scan_all_button.innerText = 'Scan All';
	scan_all_button.addEventListener('click', watchlint_scan_all);
	scan_all_button.id = 'watchlint-scanbutton';
	list.append(scan_all_button);
}

async function watchlint_scan_all() {
	var links = document.querySelectorAll(links_selector);

	for(i = 0; i < links.length; i++) {
		// reset internal RegExp pointer before any occurance of RexExp.exec()
		regex.name.lastIndex = 0;

		let container = links[i];
		let link = container.querySelector('a');
		container.classList.add('watchlint-container', 'watchlint-blink');

		await sleep(2000); // be nice to FA servers

		try {
			let name = '(unknown)';
			let html = await (await fetch(link.href)).text();

			if (watchlint_is_disabled(html)) {
				container.classList.add('watchlint-disabled');
				console.info(`[fadaf] identified disabled or deactivated account for url '${link.href}'`);
			}
			else if (watchlint_has_submissions(html)) {
				let name = regex.name.exec(html)[1];
				let age_factor = watchlint_evaluate_last_submission_age(name, html);
				container.classList.add('watchlint-age', `watchlint-age-${age_factor}`);
			}
			else {
				console.info(`[fadaf] identified empty gallery for '${name}'`);
				container.classList.add('watchlint-empty');
			}
		}
		catch(ex) {
			console.warn(`[fadaf] error in iteration ${i} of ${links.length}, target url: '${link.href}'`, ex);
		}

		container.classList.remove('watchlint-blink');
	}
}

function watchlint_has_submissions(html) {
	regex.no_submissions.lastIndex = 0;
	return !regex.no_submissions.test(html);
}

function watchlint_is_disabled(html) {
	regex.disabled.lastIndex = 0;
	return regex.disabled.test(html);
}

function watchlint_evaluate_last_submission_age(name, html) {
	regex.last_submission_age.regex.lastIndex = 0;
	let age = 120;

	try {
		let date = regex.last_submission_age.regex.exec(html)[1];
		age = Math.abs(moment(date, regex.last_submission_age.result).diff(moment(), 'months'));
		console.info(`[fadaf] determined last submission date for '${name}': ${date} (${age} months ago)`);
	}
	catch (ex) {
		console.warn(`[fadaf] failed to evaluate last submission age for '${name}'.`);
		return 0;
	}

	// determine submission age factor based on last submission age in months
	if (age <  1) return 10;
	if (age <  3) return 9;
	if (age <  5) return 8;
	if (age <  8) return 7;
	if (age < 10) return 6;
	if (age < 13) return 5;
	if (age < 18) return 3;
	if (age < 36) return 1;

	return 0;
}

function sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}