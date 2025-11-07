export function TryParseJSON<T>(jsonString: string | null | object | any[], defaultValue: T): T {
    // Return default value if input is null or undefined
    if (jsonString === null || jsonString === undefined) {
        return defaultValue;
    }

    // If input is already an object or array, return it directly
    if (typeof jsonString === 'object') {
        return jsonString as T;
    }

    // Handle non-string inputs
    if (typeof jsonString !== 'string') {
        return defaultValue;
    }

    // Trim the input string
    const trimmedString = jsonString.trim();

    // Return default for empty strings
    if (trimmedString === '') {
        return defaultValue;
    }

    try {
        // Attempt to parse the JSON string
        const parsedResult = JSON.parse(trimmedString);

        // Verify that the result is an object or array
        if (parsedResult !== null && typeof parsedResult === 'object') {
            return parsedResult as T;
        }

        // If parsed result is not an object/array, return default
        return defaultValue;
    } catch {
        return defaultValue;
    }
}


export const MakeID = (length: number): string => {
	var result = "";
	var characters = "ABCDEFGHJKLMNPQRTUVWXY346789";
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
};

// create a function to generate uuid v4
export const uuid = (): string => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

export function getOrdinalDate(isoDate: string): number {
    // Create date object from ISO string
    const date = new Date(isoDate);

    // Create date object for first day of the same year
    const startOfYear = new Date(date.getFullYear(), 0, 1);

    // Calculate difference in milliseconds
    const diff = date.getTime() - startOfYear.getTime();

    // Convert difference to days and add 1 (since January 1 is day 1)
    const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;

    return dayOfYear;
}

export function getAge(date_of_birth: string): number {
    const today = new Date();
    const birthDate = new Date(date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}