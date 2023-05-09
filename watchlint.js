var list_selector = `.section-body.watch-list`;
var links_selector = '.watch-list-items';

var fdaf_interval = 2000;
var fdaf_show_patreon = false;

var regex = {
	name: /title>Userpage of ([\w-]+)/gm,
	last_submission_age: {
		regex: /uploaded.*[>"](.*[AP]M)/gm,
		result: 'MMM DD, YYYY hh:mm A'
	},
	no_submissions: /This\suser\shas\sno\ssubmissions/gm,
	disabled: /has\svoluntarily\sdisabled\saccess|deactivated\sby\sthe\sowner/gm,
	patreon: /[Pp]atreon/gm
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
	let button = document.getElementById('watchlint-scanbutton');
	let stats = {
		recent: {value: 0},
		middle: {value: 0},
		inactive: {value: 0},
		empty: {value: 0},
		disabled: {value: 0},
		unknown: {value: 0}
	}

	button.disabled = true;
	button.innerText = '';

	for (const key in stats) {
		if (stats.hasOwnProperty(key)) {
			let span = document.createElement('span');
			span.classList.add('watchlint-stats');
			span.id = `watchlint-stats-${key}`;
			span.innerText = `0 ${key}`;
			button.appendChild(span);
			stats[key].span = span;
		}
	}

	for(i = 0; i < links.length; i++) {
		// reset internal RegExp pointer before any occurance of RexExp.exec()
		regex.name.lastIndex = 0;

		let container = links[i];
		let link = container.querySelector('a');
		container.classList.add('watchlint-container', 'watchlint-blink');

		await sleep(fdaf_interval); // be nice to FA servers

		try {
			let name = '(unknown)';
			let html = await (await fetch(link.href)).text();

			if (watchlint_is_disabled(html)) {
				stats.disabled.span.innerText = `${++stats.disabled.value} disabled`;
				container.classList.add('watchlint-disabled');
				watchlint_attach_popup(link, 'account disabled');
				console.info(`[fadaf] identified disabled or deactivated account for url '${link.href}'`);
			}
			else if (watchlint_has_submissions(html)) {
				let name = regex.name.exec(html)[1];
				let age = watchlint_evaluate_last_submission_age(name, html);
				if (age.factor !== -1) {
					container.classList.add(`watchlint-age-${age.factor}`);
					watchlint_attach_popup(link, age.age == 0? `within a month`: `${age.age} month(s) ago`);
					if (age.factor < 3) stats.inactive.span.innerText = `${++stats.inactive.value} inactive`;
					else if (age.factor < 7) stats.middle.span.innerText = `${++stats.middle.value} middle`;
					else stats.recent.span.innerText = `${++stats.recent.value} recent`;
				}
				else {
					stats.unknown.span.innerText = `${++stats.unknown.value} disabled`
					container.classList.add('watchlint-unknown');
					watchlint_attach_popup(link, '*confused*');
					console.warn(`[fadaf] failed to determine status for: '${name}', falling back to 'unknown'`);
				}
			}
			else {
				stats.empty.span.innerText = `${++stats.empty.value} empty`
				container.classList.add('watchlint-empty');
				watchlint_attach_popup(link, 'gallery empty :(');
				console.info(`[fadaf] identified empty gallery for '${name}'`);
			}

			if (fdaf_show_patreon) {
				if (watchlint_has_patreon(html)) {
					console.info(`[fdaf] possible patreon found: ${link.href}`);
				}
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
	let age = -1;

	try {
		let date = regex.last_submission_age.regex.exec(html)[1];
		age = Math.abs(moment(date, regex.last_submission_age.result).diff(moment(), 'months'));
		console.info(`[fadaf] determined last submission date for '${name}': ${date} (${age} months ago)`);

		if (isNaN(age))
			throw "[fadaf] unknown parse miss in last submission date evaluation";
	}
	catch (ex) {
		console.error(age);
		console.warn(`[fadaf] failed to evaluate last submission age for '${name}'.`, ex);
		return {age: age, factor: -1};
	}

	// determine submission age factor based on last submission age in months
	if (age <  1) return {age: age, factor: 10};
	if (age <  3) return {age: age, factor: 9};
	if (age <  6) return {age: age, factor: 8};
	if (age < 10) return {age: age, factor: 7};
	if (age < 13) return {age: age, factor: 6};
	if (age < 17) return {age: age, factor: 5};
	if (age < 25) return {age: age, factor: 3};
	if (age < 37) return {age: age, factor: 1};

	return {age: age, factor: 0};
}

function watchlint_attach_popup(target, content) {
	let div = document.createElement('div');
	div.classList.add('watchlint-popup');
	div.innerText = content;
	target.append(div);
}

function watchlint_has_patreon(html) {
	regex.patreon.lastIndex = 0;
	return regex.patreon.test(html);
}

function sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}