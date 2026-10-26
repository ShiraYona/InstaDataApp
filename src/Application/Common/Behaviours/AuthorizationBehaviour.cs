using InstaDataApp.Application.Common.Exceptions;
using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Security;

namespace InstaDataApp.Application.Common.Behaviours;

public class AuthorizationBehaviour<TRequest, TResponse>(IUser user, IIdentityService identityService) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var authorizeAttributes = request.GetType().GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>()
            .ToArray();

        if (authorizeAttributes.Length == 0)
        {
            return await next();
        }

        // Must be an authenticated user.
        if (user.Id is null)
        {
            throw new UnauthorizedAccessException();
        }

        // Role-based authorization.
        var authorizeAttributesWithRoles = authorizeAttributes
            .Where(a => !string.IsNullOrWhiteSpace(a.Roles));

        if (authorizeAttributesWithRoles.Any())
        {
            foreach (var role in authorizeAttributesWithRoles.SelectMany(a => a.Roles.Split(',')))
            {
                if (await identityService.IsInRoleAsync(user.Id, role.Trim()))
                {
                    return await next();
                }
            }

            throw new ForbiddenAccessException();
        }

        // Policy-based authorization.
        var authorizeAttributesWithPolicies = authorizeAttributes
            .Where(a => !string.IsNullOrWhiteSpace(a.Policy));

        if (authorizeAttributesWithPolicies.Any())
        {
            foreach (var policy in authorizeAttributesWithPolicies.Select(a => a.Policy))
            {
                if (await identityService.AuthorizeAsync(user.Id, policy))
                {
                    return await next();
                }
            }

            throw new ForbiddenAccessException();
        }

        return await next();
    }
}
